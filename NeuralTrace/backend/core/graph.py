import networkx as nx

class DependencyGraph:
    def __init__(self):
        self.graph = nx.DiGraph()

    def build_from_ast(self, ast):
        # Walk AST and add nodes (modules, signals) and edges (assignments, usage)
        pass

    def get_impacted_nodes(self, changed_signals: list):
        # Traverse graph to find descendants of changed signals
        impacted = set()
        for sig in changed_signals:
            if self.graph.has_node(sig):
                impacted.update(nx.descendants(self.graph, sig))
        return list(impacted)
