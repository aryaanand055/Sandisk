import os
import tempfile
from pyverilog.vparser.parser import parse

class RTLParser:
    def __init__(self):
        pass

    def parse_file(self, file_path: str):
        ast, directives = parse([file_path])
        return ast

    def parse_string(self, content: str):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.v', delete=False) as fp:
            fp.write(content)
            temp_path = fp.name
        
        try:
            ast = self.parse_file(temp_path)
            return ast
        finally:
            os.remove(temp_path)
