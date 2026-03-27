import os
from openai import OpenAI
from dotenv import load_dotenv

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
            self.model_name = 'openai/gpt-oss-20b'
            self.enabled = True
        else:
            self.enabled = False

    def generate_analysis(self, old_rtl: str, new_rtl: str, testbenches: list):
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

        prompt = f"""
        You are an RTL Verification Expert AI. You are helping a hardware engineer analyze a code change.
        
        ### RTL CONTEXT ###
        OLD CODE:
        ```verilog
        {old_rtl}
        ```
        
        NEW CODE:
        ```verilog
        {new_rtl}
        ```
        
        ### AVAILABLE TESTBENCHES ###
        {testbenches}

        ### TASK ###
        1. Identify the exact delta in the RTL (Modified Modules, Changed Signals, and Changed Blocks).
        2. Create a Real-World Verification Impact Map depicting the dependency cascade of the code change. 
           - Map how the RTL change impacts the testbench environment.
           - Node types MUST be one of: 'module', 'signal', 'verification' (e.g. UVM Driver, Monitor, Sequencer), or 'coverage'.
           - Edges must map the logical dataflow/dependency (e.g. module -> signal -> verification -> coverage).
        3. Assess the risk level of this change (High, Medium, or Low) based on verification impact.
        4. Provide exactly 3 specific, actionable verification suggestions.
        5. Identify which of the available testbenches MUST be run again due to the changes.
           - Be conservative: if a module is changed, any testbench that uses that module or its hierarchies must be rerun.
           - If a signal name is changed, all testbenches that monitor it or rely on it for assertions must be rerun.
        
        Return strictly a valid JSON object matching this schema:
        {{
          "delta": {{
              "modified_modules": ["module1"],
              "changed_signals": ["sig1"],
              "changed_blocks": ["always block description"]
          }},
          "impact_map": {{
              "nodes": [
                 {{"id": "1", "label": "Module UART", "type": "module"}},
                 {{"id": "2", "label": "Interface: tx_data", "type": "signal"}},
                 {{"id": "3", "label": "UVM Monitor: tx_data", "type": "verification"}},
                 {{"id": "4", "label": "Coverage: tx_data Enum", "type": "coverage"}}
              ],
              "edges": [
                 {{"source": "1", "target": "2"}},
                 {{"source": "2", "target": "3"}},
                 {{"source": "3", "target": "4"}}
              ]
          }},
          "risk": "Medium",
          "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
          "stale_testbenches": ["tb_filename1.v"]
        }}
        """
        
        try:
            response = self.client.responses.create(
                model=self.model_name,
                input=prompt
            )
            import json
            import re
            
            raw_text = response.output_text
            
            # Clean up potential markdown formatting that might be injected
            raw_text = re.sub(r'^```json\s*', '', raw_text.strip(), flags=re.IGNORECASE)
            raw_text = re.sub(r'\s*```$', '', raw_text.strip())
            
            data = json.loads(raw_text)
            return data

        except Exception as e:
            return {
                "delta": {"modified_modules": [], "changed_signals": [], "changed_blocks": []},
                "impact_map": {"nodes": [], "edges": []},
                "risk": "Error",
                "suggestions": [f"AI call failed: {str(e)}"],
                "stale_testbenches": []
            }
