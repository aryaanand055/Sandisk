import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

class AIEngine:
    def __init__(self):
        # The user will need to set GEMINI_API_KEY in their .env
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            self.client = genai.Client(api_key=api_key)
            self.model_name = 'gemini-2.5-flash'
            self.enabled = True
        else:
            self.enabled = False

    def generate_analysis(self, old_rtl: str, new_rtl: str):
        if not self.enabled:
            return {
                "delta": {"modified_modules": [], "changed_signals": [], "changed_blocks": []},
                "impact_map": {"nodes": [], "edges": []},
                "risk": "Medium (AI disabled - no API Key)",
                "suggestions": [
                    "Please set GEMINI_API_KEY in .env for actual AI suggestions.",
                    "Verify manual changes in the identified modules."
                ]
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
        
        ### TASK ###
        1. Identify the exact delta in the RTL (Modified Modules, Changed Signals, and Changed Blocks).
        2. Create a Real-World Verification Impact Map depicting the dependency cascade of the code change. 
           - Map how the RTL change impacts the testbench environment.
           - Node types MUST be one of: 'module', 'signal', 'verification' (e.g. UVM Driver, Monitor, Sequencer), or 'coverage'.
           - Edges must map the logical dataflow/dependency (e.g. module -> signal -> verification -> coverage).
        3. Assess the risk level of this change (High, Medium, or Low) based on verification impact.
        4. Provide exactly 3 specific, actionable verification suggestions (e.g. "Update UVM Driver to sample X", "Add functional coverage bin for Y").
        
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
          "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
        }}
        """
        
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config={'response_mime_type': 'application/json'}
            )
            import json
            import re
            
            raw_text = response.text
            
            # Clean up potential markdown formatting that Gemini might occasionally inject
            raw_text = re.sub(r'^```json\s*', '', raw_text.strip())
            raw_text = re.sub(r'\s*```$', '', raw_text.strip())
            
            data = json.loads(raw_text)
            return data

        except Exception as e:
            return {
                "delta": {"modified_modules": [], "changed_signals": [], "changed_blocks": []},
                "impact_map": {"nodes": [], "edges": []},
                "risk": "Error",
                "suggestions": [f"AI call failed: {str(e)}"]
            }
