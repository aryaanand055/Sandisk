import networkx as nx
import os
import json
from pathlib import Path
from pyverilog.vparser.parser import parse, VerilogParser
from pyverilog.vparser import ast
from typing import Dict, List, Tuple, Set
from collections import defaultdict


FUNCTION_NODE_TYPES = tuple(
    t for t in (getattr(ast, 'FunctionDef', None), getattr(ast, 'Function', None)) if t is not None
)
GENERATE_NODE_TYPES = tuple(
    t for t in (getattr(ast, 'GenerateStatement', None),) if t is not None
)


class VerilogASTVisitor:
    """Visitor to extract comprehensive information from Verilog AST."""
    
    def __init__(self, filename: str):
        self.filename = filename
        self.modules = {}  # module_name -> module_info
        self.current_module = None
        self.signals = defaultdict(list)  # module_name -> [signal_info]
        self.functions = defaultdict(list)  # module_name -> [function_info]
        self.generate_blocks = defaultdict(list)  # module_name -> [generate_info]
        self.always_blocks = defaultdict(list)  # module_name -> [always_block_info]
        self.assign_blocks = defaultdict(list)  # module_name -> [assign_info]
        self.instances = defaultdict(list)  # module_name -> [instance_info]
        self.links = []  # list of (source_node, target_node, link_type, metadata)
    
    def visit(self, node, line=None):
        """Recursively visit AST nodes."""
        if node is None:
            return
        
        # Handle Module definitions
        if isinstance(node, ast.ModuleDef):
            self._visit_module(node)
        
        # Handle Port listings
        elif isinstance(node, ast.Portlist):
            self._visit_portlist(node, line)
        
        # Handle Parameter declarations
        elif isinstance(node, ast.Parameter):
            self._visit_parameter(node, line)
        
        # Handle various signal declarations
        elif isinstance(node, ast.Decl):
            self._visit_decl(node, line)
        elif isinstance(node, ast.Input):
            self._visit_port_decl(node, 'input', line)
        elif isinstance(node, ast.Output):
            self._visit_port_decl(node, 'output', line)
        elif isinstance(node, ast.Inout):
            self._visit_port_decl(node, 'inout', line)
        
        # Handle Always blocks (sequential/combinational logic)
        elif isinstance(node, ast.Always):
            self._visit_always(node, line)
        
        # Handle Assign statements
        elif isinstance(node, ast.Assign):
            self._visit_assign(node, line)

        # Handle module instantiations
        elif isinstance(node, ast.InstanceList):
            self._visit_instance_list(node, line)
        
        # Handle Generate blocks
        elif GENERATE_NODE_TYPES and isinstance(node, GENERATE_NODE_TYPES):
            self._visit_generate(node, line)
        
        # Handle Function definitions
        elif FUNCTION_NODE_TYPES and isinstance(node, FUNCTION_NODE_TYPES):
            self._visit_function(node, line)
        
        # Recursively visit children
        if hasattr(node, 'children'):
            for child_node in node.children():
                if isinstance(child_node, list):
                    for item in child_node:
                        self.visit(item, getattr(item, 'lineno', line))
                else:
                    self.visit(child_node, getattr(child_node, 'lineno', line))
    
    def _visit_module(self, node):
        """Extract module information."""
        self.current_module = node.name
        self.modules[node.name] = {
            'name': node.name,
            'ports': [],
            'parameters': [],
            'signals': [],
            'instances': [],
            'line': getattr(node, 'lineno', 0)
        }
    
    def _visit_portlist(self, node, line):
        """Extract port information."""
        if self.current_module and node.ports:
            for port in node.ports:
                port_name = self._extract_port_name(port)
                if not port_name:
                    continue

                # Avoid duplicate entries when ANSI-style declarations are also present.
                if any(p.get('name') == port_name for p in self.modules[self.current_module]['ports']):
                    continue

                port_info = {
                    'name': port_name,
                    'direction': 'unknown',
                    'type': 'port',
                    'line': line or 0
                }
                self.modules[self.current_module]['ports'].append(port_info)
                self.signals[self.current_module].append(port_info)
    
    def _visit_parameter(self, node, line):
        """Extract parameter declarations."""
        if self.current_module:
            items = getattr(node, 'items', None)
            if items is None:
                items = [node]

            for item in items:
                if isinstance(item, tuple):
                    param_name = item[0]
                    param_value = item[1]
                else:
                    param_name = item.name if hasattr(item, 'name') else str(item)
                    param_value = None
                
                param_info = {
                    'name': param_name,
                    'type': 'parameter',
                    'value': param_value,
                    'line': line or 0
                }
                self.modules[self.current_module]['parameters'].append(param_info)
                self.signals[self.current_module].append(param_info)
    
    def _visit_decl(self, node, line):
        """Extract variable declarations (wire, reg, etc.)."""
        if self.current_module:
            decl_type = node.list[0].__class__.__name__ if node.list else 'unknown'
            
            for var in node.list:
                var_name = var.name if hasattr(var, 'name') else str(var)
                signal_info = {
                    'name': var_name,
                    'type': decl_type,  # Wire, Reg, etc.
                    'width': self._extract_width(var),
                    'line': line or 0
                }
                self.signals[self.current_module].append(signal_info)
    
    def _visit_port_decl(self, node, direction, line):
        """Extract port declarations."""
        if self.current_module:
            vars_list = getattr(node, 'list', None)
            if vars_list is None:
                vars_list = [node]

            for var in vars_list:
                var_name = self._extract_node_name(var) or self._extract_node_name(node)
                if not var_name:
                    continue

                port_info = {
                    'name': var_name,
                    'type': 'port',
                    'direction': direction,
                    'width': self._extract_width(var if hasattr(var, 'width') else node),
                    'line': line or 0
                }

                if not any(s.get('name') == var_name and s.get('type') == 'port' for s in self.signals[self.current_module]):
                    self.signals[self.current_module].append(port_info)

                if self.current_module in self.modules:
                    if not any(p.get('name') == var_name for p in self.modules[self.current_module]['ports']):
                        self.modules[self.current_module]['ports'].append(port_info)
    
    def _visit_always(self, node, line):
        """Extract always block information."""
        if self.current_module:
            sens = getattr(node, 'senslist', None)
            if sens is None:
                sens = getattr(node, 'sens_list', None)

            block_info = {
                'type': 'always_block',
                'sense': str(sens) if sens else 'combinational',
                'line': line or 0
            }
            self.always_blocks[self.current_module].append(block_info)
            
            # Extract signal usage within always block
            self._extract_signal_usage(node, 'always_block')
    
    def _visit_assign(self, node, line):
        """Extract assign statement information."""
        if self.current_module:
            assign_info = {
                'type': 'assign',
                'operator': node.operator if hasattr(node, 'operator') else '=',
                'line': line or 0
            }
            self.assign_blocks[self.current_module].append(assign_info)
            
            # Extract assignment relationships
            self._extract_assignment_links(node)

    def _visit_instance_list(self, node, line):
        """Extract module instantiation information for hierarchy edges."""
        if not self.current_module:
            return

        module_attr = getattr(node, 'module', None)
        module_type = module_attr if isinstance(module_attr, str) else self._extract_node_name(module_attr)
        if not module_type:
            module_type = self._extract_node_name(node)

        for inst in getattr(node, 'instances', []) or []:
            instance_info = {
                'module': module_type,
                'instance': self._extract_node_name(inst),
                'type': 'module_instance',
                'line': line or getattr(inst, 'lineno', 0) or 0
            }
            self.instances[self.current_module].append(instance_info)
            if self.current_module in self.modules:
                self.modules[self.current_module]['instances'].append(instance_info)
    
    def _visit_generate(self, node, line):
        """Extract generate block information."""
        if self.current_module:
            gen_info = {
                'type': 'generate',
                'line': line or 0
            }
            self.generate_blocks[self.current_module].append(gen_info)
    
    def _visit_function(self, node, line):
        """Extract function definitions."""
        if self.current_module:
            func_info = {
                'name': node.name,
                'type': 'function',
                'return_type': str(node.rettype) if hasattr(node, 'rettype') else 'unknown',
                'line': line or 0
            }
            self.functions[self.current_module].append(func_info)
    
    def _extract_width(self, var) -> str:
        """Extract bit width from variable declaration."""
        if hasattr(var, 'width') and var.width:
            return str(var.width)
        return 'unknown'
    
    def _extract_signal_usage(self, node, context):
        """Extract signal usage patterns within a block."""
        # Simple recursive extraction of identifiers
        if node is None:
            return
        
        if hasattr(node, 'children'):
            for child_node in node.children():
                if isinstance(child_node, list):
                    for item in child_node:
                        self._extract_signal_usage(item, context)
                else:
                    self._extract_signal_usage(child_node, context)
    
    def _extract_assignment_links(self, node):
        """Extract assignment relationships."""
        # This would parse LHS and RHS to create links
        if hasattr(node, 'left') and hasattr(node, 'right'):
            left_name = self._extract_node_name(node.left)
            right_name = self._extract_node_name(node.right)
            if left_name and right_name:
                self.links.append({
                    'module': self.current_module,
                    'source': right_name,
                    'target': left_name,
                    'type': 'assignment',
                    'operator': '='
                })

    def _extract_port_name(self, port) -> str:
        """Extract clean port names from both legacy and ANSI-style AST nodes."""
        if port is None:
            return ''

        # ast.Port / ast.Ioport with direct name
        name = getattr(port, 'name', None)
        if isinstance(name, str) and name:
            return name

        # ast.Ioport often stores declaration in first/second child
        for attr in ('first', 'second'):
            child = getattr(port, attr, None)
            child_name = self._extract_node_name(child)
            if child_name:
                return child_name

        return self._extract_node_name(port)
    
    def _extract_node_name(self, node) -> str:
        """Extract identifier name from AST node."""
        if node is None:
            return ''
        if isinstance(node, str):
            return node
        if hasattr(node, 'name'):
            name = node.name
            if isinstance(name, str):
                return name
            # Some nodes hold an Identifier-like object as .name
            nested = self._extract_node_name(name)
            if nested:
                return nested
        if hasattr(node, 'var'):
            return self._extract_node_name(node.var)
        if hasattr(node, 'first'):
            first_name = self._extract_node_name(node.first)
            if first_name:
                return first_name
        if hasattr(node, 'second'):
            second_name = self._extract_node_name(node.second)
            if second_name:
                return second_name
        if hasattr(node, 'children'):
            for child in node.children():
                child_name = self._extract_node_name(child)
                if child_name:
                    return child_name
        return ''


class DependencyGraph:
    def __init__(self):
        self.graph = nx.DiGraph()
        self.node_metadata = {}  # node_id -> metadata dict
        self.file_scopes = {}  # node_id -> filename where defined
        self.all_modules = {}  # module_name -> module_info
        self.all_signals = defaultdict(list)  # module_name -> [signals]
        self.all_functions = defaultdict(list)
        self.all_parameters = defaultdict(list)

    def build_full_codebase_graph(self, verilog_files: Dict[str, str]) -> Tuple[nx.DiGraph, Dict]:
        """
        Build comprehensive dependency graph from multiple Verilog files.
        
        Args:
            verilog_files: {filename -> file_content}
        
        Returns:
            (graph, metadata) where metadata contains all extracted information
        """
        # Reset graph state on every rebuild so each request reflects current files only.
        self.graph.clear()
        self.node_metadata.clear()
        self.file_scopes.clear()
        self.all_modules = {}
        self.all_signals = defaultdict(list)
        self.all_functions = defaultdict(list)
        self.all_parameters = defaultdict(list)

        all_visitors = {}
        
        # Parse each file and extract AST
        for filename, content in verilog_files.items():
            try:
                # Write content to temp file since PyVerilog parser sometimes needs file paths
                temp_path = f"/tmp/{filename}"
                os.makedirs("/tmp", exist_ok=True)
                with open(temp_path, 'w') as f:
                    f.write(content)
                
                # Parse Verilog from file path first.
                # This path may fail when external preprocessors (for example iverilog) are unavailable.
                try:
                    ast_module, _directives = parse([temp_path])
                except Exception:
                    # Fallback to parser-on-text, which works without external preprocessors.
                    parser = VerilogParser()
                    ast_module = parser.parse(content)
                
                # Visit AST
                visitor = VerilogASTVisitor(filename)
                visitor.visit(ast_module)
                all_visitors[filename] = visitor
                
                # Aggregate module/signal information
                self.all_modules.update(visitor.modules)
                for mod, signals in visitor.signals.items():
                    self.all_signals[mod].extend(signals)
                for mod, funcs in visitor.functions.items():
                    self.all_functions[mod].extend(funcs)
                
            except Exception as e:
                print(f"Error parsing {filename}: {str(e)}")
                continue
        
        # Build graph nodes
        self._build_graph_nodes(all_visitors)
        
        # Build graph edges
        self._build_graph_edges(all_visitors)
        
        # Compute metrics
        self._compute_node_metrics()
        
        return self.graph, {
            'modules': self.all_modules,
            'signals': dict(self.all_signals),
            'functions': dict(self.all_functions),
            'node_metadata': self.node_metadata,
            'file_scopes': self.file_scopes
        }

    def _build_graph_nodes(self, all_visitors):
        """Build all nodes in the dependency graph."""
        for filename, visitor in all_visitors.items():
            # Add module nodes
            for mod_name, mod_info in visitor.modules.items():
                node_id = f"module:{mod_name}"
                self.graph.add_node(node_id, 
                    type='module',
                    name=mod_name,
                    filename=filename,
                    metadata=mod_info)
                self.node_metadata[node_id] = {
                    'type': 'module',
                    'name': mod_name,
                    'file': filename,
                    'line': mod_info.get('line', 0),
                    'ports': mod_info.get('ports', []),
                    'parameters': mod_info.get('parameters', [])
                }
                self.file_scopes[node_id] = filename
            
            # Add signal nodes
            for mod_name, signals in visitor.signals.items():
                for signal in signals:
                    node_id = f"signal:{mod_name}:{signal['name']}"
                    self.graph.add_node(node_id,
                        type='signal',
                        name=signal['name'],
                        module=mod_name,
                        filename=filename,
                        metadata=signal)
                    self.node_metadata[node_id] = {
                        'type': 'signal',
                        'name': signal['name'],
                        'module': mod_name,
                        'file': filename,
                        'line': signal.get('line', 0),
                        'signal_type': signal.get('type', 'unknown'),
                        'width': signal.get('width', 'unknown'),
                        'direction': signal.get('direction', 'unknown')
                    }
                    self.file_scopes[node_id] = filename
            
            # Add function nodes
            for mod_name, functions in visitor.functions.items():
                for func in functions:
                    node_id = f"function:{mod_name}:{func['name']}"
                    self.graph.add_node(node_id,
                        type='function',
                        name=func['name'],
                        module=mod_name,
                        filename=filename,
                        metadata=func)
                    self.node_metadata[node_id] = {
                        'type': 'function',
                        'name': func['name'],
                        'module': mod_name,
                        'file': filename,
                        'return_type': func.get('return_type', 'unknown'),
                        'line': func.get('line', 0)
                    }
                    self.file_scopes[node_id] = filename
            
            # Add always/assign block nodes
            for mod_name, blocks in visitor.always_blocks.items():
                for i, block in enumerate(blocks):
                    node_id = f"always:{mod_name}:{i}"
                    self.graph.add_node(node_id,
                        type='always_block',
                        module=mod_name,
                        filename=filename,
                        metadata=block)
                    self.node_metadata[node_id] = {
                        'type': 'always_block',
                        'module': mod_name,
                        'file': filename,
                        'sense': block.get('sense', 'unknown'),
                        'line': block.get('line', 0)
                    }
            
            for mod_name, blocks in visitor.assign_blocks.items():
                for i, block in enumerate(blocks):
                    node_id = f"assign:{mod_name}:{i}"
                    self.graph.add_node(node_id,
                        type='assign_block',
                        module=mod_name,
                        filename=filename,
                        metadata=block)
                    self.node_metadata[node_id] = {
                        'type': 'assign_block',
                        'module': mod_name,
                        'file': filename,
                        'operator': block.get('operator', 'unknown'),
                        'line': block.get('line', 0)
                    }
    
    def _build_graph_edges(self, all_visitors):
        """Build all edges in the dependency graph."""
        for filename, visitor in all_visitors.items():
            # Create edges from modules to their signals, ports, parameters
            for mod_name, mod_info in visitor.modules.items():
                mod_node_id = f"module:{mod_name}"

                # Module -> internal logic blocks
                for i, _block in enumerate(visitor.always_blocks.get(mod_name, [])):
                    block_node_id = f"always:{mod_name}:{i}"
                    if self.graph.has_node(block_node_id):
                        self.graph.add_edge(mod_node_id, block_node_id,
                            edge_type='has_logic_block')

                for i, _block in enumerate(visitor.assign_blocks.get(mod_name, [])):
                    block_node_id = f"assign:{mod_name}:{i}"
                    if self.graph.has_node(block_node_id):
                        self.graph.add_edge(mod_node_id, block_node_id,
                            edge_type='has_logic_block')

                # Module -> functions
                for func in visitor.functions.get(mod_name, []):
                    func_node_id = f"function:{mod_name}:{func['name']}"
                    if self.graph.has_node(func_node_id):
                        self.graph.add_edge(mod_node_id, func_node_id,
                            edge_type='has_function',
                            line=func.get('line', 0))
                
                # Module -> Ports
                for port in mod_info.get('ports', []):
                    signal_node_id = f"signal:{mod_name}:{port['name']}"
                    if self.graph.has_node(signal_node_id):
                        self.graph.add_edge(mod_node_id, signal_node_id, 
                            edge_type='has_port', 
                            line=port.get('line', 0))
                
                # Module -> Parameters
                for param in mod_info.get('parameters', []):
                    signal_node_id = f"signal:{mod_name}:{param['name']}"
                    if self.graph.has_node(signal_node_id):
                        self.graph.add_edge(mod_node_id, signal_node_id,
                            edge_type='has_parameter',
                            line=param.get('line', 0))

                # Module -> non-port signals (wires/regs/local vars)
                for signal in visitor.signals.get(mod_name, []):
                    if signal.get('type') == 'port' or signal.get('type') == 'parameter':
                        continue
                    signal_node_id = f"signal:{mod_name}:{signal['name']}"
                    if self.graph.has_node(signal_node_id):
                        self.graph.add_edge(mod_node_id, signal_node_id,
                            edge_type='has_signal',
                            line=signal.get('line', 0))

                # Module hierarchy: parent module -> child module type
                for inst in visitor.instances.get(mod_name, []):
                    child_module = inst.get('module')
                    if not child_module:
                        continue
                    child_node_id = f"module:{child_module}"
                    if self.graph.has_node(child_node_id):
                        self.graph.add_edge(mod_node_id, child_node_id,
                            edge_type='module_instantiation',
                            instance=inst.get('instance', ''),
                            line=inst.get('line', 0))
            
            # Create edges from assignment/always blocks to signals
            for mod_name, blocks in visitor.always_blocks.items():
                for i, block in enumerate(blocks):
                    block_node_id = f"always:{mod_name}:{i}"
                    # Always block implicitly uses all signals in module
                    for signal in visitor.signals.get(mod_name, []):
                        signal_node_id = f"signal:{mod_name}:{signal['name']}"
                        if self.graph.has_node(signal_node_id):
                            self.graph.add_edge(block_node_id, signal_node_id,
                                edge_type='uses_signal',
                                line=signal.get('line', 0))
            
            # Create edges from assignment links
            for link in visitor.links:
                link_module = link.get('module')
                source_id = f"signal:{link_module}:{link['source']}" if link_module else link['source']
                target_id = f"signal:{link_module}:{link['target']}" if link_module else link['target']
                
                if self.graph.has_node(source_id) and self.graph.has_node(target_id):
                    self.graph.add_edge(source_id, target_id,
                        edge_type='assignment',
                        operator=link.get('operator', '='))
    
    def _compute_node_metrics(self):
        """Compute criticality and impact metrics for each node."""
        for node in self.graph.nodes():
            in_degree = self.graph.in_degree(node)
            out_degree = self.graph.out_degree(node)
            
            # Criticality score: higher out-degree = more critical (affects more nodes)
            criticality = (out_degree * 2 + in_degree) / (1 + len(self.graph.nodes()))
            
            # Compute affected descendants (impact chain)
            try:
                descendants = set(nx.descendants(self.graph, node))
            except:
                descendants = set()
            
            self.node_metadata[node].update({
                'in_degree': in_degree,
                'out_degree': out_degree,
                'criticality': criticality,
                'descendant_count': len(descendants),
                'affected_nodes': list(descendants)
            })

    def find_verilog_files(self, root_path: str) -> Dict[str, str]:
        """Find all .v and .sv files in a directory tree."""
        verilog_files = {}
        for root, dirs, files in os.walk(root_path):
            for file in files:
                if file.endswith(('.v', '.sv')):
                    filepath = os.path.join(root, file)
                    try:
                        with open(filepath, 'r') as f:
                            verilog_files[file] = f.read()
                    except Exception as e:
                        print(f"Error reading {filepath}: {str(e)}")
        return verilog_files

    def get_impacted_nodes(self, changed_signals: list):
        """Traverse graph to find descendants of changed signals."""
        impacted = set()
        for sig in changed_signals:
            if self.graph.has_node(sig):
                impacted.update(nx.descendants(self.graph, sig))
        return list(impacted)
    
    def get_graph_snapshot(self) -> Dict:
        """Return complete graph as serializable dict."""
        nodes = []
        edges = []
        
        for node in self.graph.nodes():
            node_data = {
                'id': node,
                'metadata': self.node_metadata.get(node, {})
            }
            nodes.append(node_data)
        
        for source, target, data in self.graph.edges(data=True):
            edge_data = {
                'source': source,
                'target': target,
                'data': data
            }
            edges.append(edge_data)
        
        return {
            'nodes': nodes,
            'edges': edges,
            'node_count': len(nodes),
            'edge_count': len(edges)
        }
