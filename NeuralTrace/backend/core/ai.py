import os
import re
from openai import OpenAI
from dotenv import load_dotenv
from typing import Dict, List, Set, Tuple

load_dotenv()

class AIEngine:
    def __init__(self):
        # The user has set GROQ_API_KEY in their .env
        api_key = os.getenv("GROQ_API_KEY")
        if api_key:
            self.client = OpenAI(
                api_key=api_key,
                base_url="https://api.groq.com/openai/v1",
            )
            self.model_name = 'llama-3.3-70b-versatile'
            self.enabled = True
        else:
            self.enabled = False

    def _extract_modules_from_code(self, rtl_code: str) -> Set[str]:
        """Extract module names defined in Verilog code."""
        modules = set()
        module_pattern = r'^\s*module\s+(\w+)\s*[\(;]'
        for match in re.finditer(module_pattern, rtl_code, re.MULTILINE):
            modules.add(match.group(1))
        return modules
    
    def _extract_module_instantiations(self, rtl_code: str) -> Dict[str, List[str]]:
        """Extract which modules instantiate which other modules."""
        instantiations = {}
        current_module = None
        module_pattern = r'^\s*module\s+(\w+)\s*[\(;]'
        instance_pattern = r'^\s*(\w+)\s+(\w+)\s*\('
        
        for line in rtl_code.split('\n'):
            module_match = re.match(module_pattern, line)
            if module_match:
                current_module = module_match.group(1)
                instantiations[current_module] = []
            elif current_module and re.match(instance_pattern, line):
                instance_match = re.match(instance_pattern, line)
                if instance_match:
                    module_type = instance_match.group(1)
                    if module_type not in ['reg', 'wire', 'input', 'output', 'logic', 'bit', 'int']:
                        instantiations[current_module].append(module_type)
        
        return instantiations
    
    def _analyze_rtl_delta(self, old_rtl: str, new_rtl: str) -> Dict:
        """Analyze structural differences between old and new RTL."""
        old_modules = self._extract_modules_from_code(old_rtl)
        new_modules = self._extract_modules_from_code(new_rtl)
        
        added_modules = new_modules - old_modules
        deleted_modules = old_modules - new_modules
        
        # Find modified modules by comparing line-by-line
        modified_modules = set()
        for module in old_modules & new_modules:
            # Extract module content
            old_module_match = re.search(f'module\\s+{module}\\s*[\\(].*?^endmodule', old_rtl, re.MULTILINE | re.DOTALL)
            new_module_match = re.search(f'module\\s+{module}\\s*[\\(].*?^endmodule', new_rtl, re.MULTILINE | re.DOTALL)
            
            if old_module_match and new_module_match:
                old_module_code = old_module_match.group(0)
                new_module_code = new_module_match.group(0)
                if old_module_code != new_module_code:
                    modified_modules.add(module)
        
        return {
            'added_modules': list(added_modules),
            'deleted_modules': list(deleted_modules),
            'modified_modules': list(modified_modules)
        }
    
    def _map_testbenches_to_modules(self, testbenches: Dict[str, str], rtl_code: str) -> Dict[str, List[str]]:
        """Map testbenches to the modules they test."""
        testbench_to_modules = {}
        
        # Extract all modules defined in RTL
        rtl_modules = self._extract_modules_from_code(rtl_code)
        
        for tb_name, tb_code in testbenches.items():
            testbench_to_modules[tb_name] = []
            
            # Check which modules are instantiated in this testbench
            for module in rtl_modules:
                # Look for module instantiation in testbench
                if re.search(f'\\b{module}\\s+\\w+\\s*\\(', tb_code):
                    testbench_to_modules[tb_name].append(module)
            
            # Also check for module reference in includes or comments
            for line in tb_code.split('\n'):
                for module in rtl_modules:
                    if module in line and ('instantiate' in line.lower() or 'test' in line.lower() or 'verify' in line.lower()):
                        if module not in testbench_to_modules[tb_name]:
                            testbench_to_modules[tb_name].append(module)
        
        return testbench_to_modules
    
    def _determine_affected_testbenches(self, modified_rtl: str, testbenches: Dict[str, str], 
                                      rtl_code: str) -> List[str]:
        """Determine which testbenches need to be rerun based on changes."""
        delta = self._analyze_rtl_delta(rtl_code, modified_rtl)
        testbench_mapping = self._map_testbenches_to_modules(testbenches, rtl_code)
        
        affected_testbenches = []
        affected_modules = set(delta['modified_modules'] + delta['added_modules'] + delta['deleted_modules'])
        
        for tb_name, modules_tested in testbench_mapping.items():
            # If any module tested by this testbench was modified, it needs to rerun
            if any(module in affected_modules for module in modules_tested):
                affected_testbenches.append(tb_name)
        
        return affected_testbenches

    def generate_analysis(self, old_rtl: str, new_rtl: str, testbenches: Dict[str, str]):
        if not self.enabled:
            return {
                "delta": {"modified_modules": [], "changed_signals": [], "changed_blocks": []},
                "impact_map": {"nodes": [], "edges": []},
                "risk": "Medium (AI disabled - no API Key)",
                "suggestions": [
                    "Please set GROQ_API_KEY in .env for actual AI suggestions.",
                    "Verify manual changes in the identified modules."
                ],
                "stale_testbenches": []
            }
        
        # Perform structural analysis
        rtl_delta = self._analyze_rtl_delta(old_rtl, new_rtl)
        affected_testbenches = self._determine_affected_testbenches(new_rtl, testbenches, old_rtl)
        
        # Format testbench content for context
        testbench_context = "\n\n".join([
            f"### Testbench: {tb_name} (Tests modules: {', '.join(self._map_testbenches_to_modules({tb_name: code}, old_rtl).get(tb_name, []))})\n```verilog\n{code[:1000]}...\n```"
            for tb_name, code in list(testbenches.items())[:5]  # Limit to first 5 for context
        ])
        
        # Build detailed prompt with structural information
        prompt = f"""
You are an expert RTL Verification Engineer. Analyze this Verilog code change with precision.

### STRUCTURAL ANALYSIS (PRE-COMPUTED) ###
Modified Modules: {', '.join(rtl_delta['modified_modules']) or 'NONE'}
Added Modules: {', '.join(rtl_delta['added_modules']) or 'NONE'}
Deleted Modules: {', '.join(rtl_delta['deleted_modules']) or 'NONE'}
Testbenches Affected by Changes: {', '.join(affected_testbenches) or 'NONE'}

### RTL CODE CHANGES ###
OLD CODE:
```verilog
{old_rtl[:2000]}
```

NEW CODE:
```verilog
{new_rtl[:2000]}
```

### TESTBENCH CONTEXT ###
{testbench_context}

### ANALYSIS REQUIREMENTS ###
1. **Identify Modified Signals**: List all signals, ports, or parameters that changed
2. **Changed Logic Blocks**: Identify always blocks, assign statements, or state machines that were modified
3. **Critical Impact**: Evaluate impact on module functionality using this logic:
   - Core logic changes = HIGH risk (always/combinational blocks modified)
   - Parameter/port changes = MEDIUM-HIGH risk (may affect multiple testbenches)
   - Signal name/type changes = MEDIUM risk (affects testbench coupling)
   - Internal signal changes = MEDIUM risk (affects internal behavior)
   - Comments/whitespace only = LOW risk (no functional impact)
4. **Verification Impact Chain**: Create clear dataflow showing how changes cascade
5. **Testbench Selection MUST follow these rules**:
   - Mark testbenches that instantiate modified modules as STALE
   - Mark testbenches that depend on modified parameters as STALE
   - Mark testbenches that monitor modified signals as STALE
   - Do NOT mark testbenches as stale if only comments/whitespace changed
   - Use the pre-computed "Testbenches Affected by Changes" as a strong signal

Return ONLY valid JSON (no markdown, no code blocks):
{{
  "delta": {{
    "modified_modules": {rtl_delta['modified_modules']},
    "changed_signals": ["list of changed signals/ports"],
    "changed_blocks": ["list of changed always blocks or assign statements"]
  }},
  "impact_map": {{
    "nodes": [
      {{"id": "1", "label": "Module name", "type": "module"}},
      {{"id": "2", "label": "Signal name", "type": "signal"}},
      {{"id": "3", "label": "Test coverage", "type": "verification"}}
    ],
    "edges": [
      {{"source": "1", "target": "2"}},
      {{"source": "2", "target": "3"}}
    ]
  }},
  "risk": "High|Medium|Low",
  "risk_reason": "explain the risk level based on change type",
  "suggestions": [
    {{"description": "specific, actionable suggestion 1", "fixed_code": "full corrected module code"}},
    {{"description": "specific, actionable suggestion 2", "fixed_code": "full corrected module code"}},
    {{"description": "specific, actionable suggestion 3", "fixed_code": "full corrected module code"}}
  ],
  "stale_testbenches": {affected_testbenches}
}}
"""
        
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are an RTL Verification Expert AI. Return strictly valid JSON format (no markdown code blocks)."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            import json
            raw_text = response.choices[0].message.content
            
            if not raw_text:
                raise ValueError("Empty response from AI")

            # Clean up potential markdown formatting
            raw_text = re.sub(r'^```(?:json)?\s*', '', raw_text.strip(), flags=re.IGNORECASE)
            raw_text = re.sub(r'\s*```$', '', raw_text.strip())
            
            data = json.loads(raw_text)
            
            # Ensure stale_testbenches contains the affected ones
            if 'stale_testbenches' not in data:
                data['stale_testbenches'] = affected_testbenches
            
            return data

        except Exception as e:
            # Fallback to structural analysis if AI fails
            return {
                "delta": {
                    "modified_modules": rtl_delta['modified_modules'],
                    "changed_signals": [],
                    "changed_blocks": []
                },
                "impact_map": {"nodes": [], "edges": []},
                "risk": "Medium",
                "risk_reason": f"AI analysis failed, using structural detection: {str(e)}",
                "suggestions": [
                    {"description": "Run all affected testbenches to validate changes", "fixed_code": new_rtl}
                ],
                "stale_testbenches": affected_testbenches
            }

