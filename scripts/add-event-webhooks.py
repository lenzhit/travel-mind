"""Idempotently add authenticated local event entrypoints to n8n exports."""
import copy
import json
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

root = Path(__file__).resolve().parents[1] / "workflows" / "n8n"
for kind in ("consultation", "quotation", "reservation", "notifications", "exception"):
    path = root / f"wf_{'exception_handling' if kind == 'exception' else kind}.json"
    workflow = json.loads(path.read_text(encoding="utf-8"))
    workflow["nodes"] = [node for node in workflow["nodes"] if node["id"] not in {"event-webhook", "event-auth", "event-callback"}]
    scheduled = next(node for node in workflow["nodes"] if node["id"] == "next")
    webhook = {
        "parameters": {"httpMethod": "POST", "path": f"travelmind-{kind}", "responseMode": "onReceived", "options": {}},
        "id": "event-webhook", "name": "Event Webhook", "type": "n8n-nodes-base.webhook", "typeVersion": 2,
        "webhookId": str(uuid5(NAMESPACE_URL, f"travelmind-{kind}")), "position": [240, 620],
        "notes": "Solo loopback. El token se compara antes de usar la identidad system; el cuerpo contiene UUID sin PII.",
    }
    auth = {
        "parameters": {"conditions": {"options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict", "version": 2},
            "combinator": "and", "conditions": [{"id": "event-token-check",
                "leftValue": "={{ $json.headers['x-travelmind-event-token'] }}",
                "rightValue": "={{ $env.WORKFLOW_INTERNAL_TOKEN }}",
                "operator": {"type": "string", "operation": "equals"}}]}},
        "id": "event-auth", "name": "Check Event Token", "type": "n8n-nodes-base.if", "typeVersion": 2,
        "position": [430, 620], "notes": "Rama falsa termina sin invocar Next.js.",
    }
    callback = copy.deepcopy(scheduled)
    callback.update({"id": "event-callback", "name": "Process Event", "position": [650, 620]})
    callback["parameters"]["url"] = "={{ 'http://host.docker.internal:3000/api/internal/workflows/events/' + $json.body.id }}"
    callback["notes"] = "Next.js reclama una vez, persiste resultado y limita reintentos. Un replay es idempotente."
    workflow["nodes"].extend([webhook, auth, callback])
    workflow["connections"]["Event Webhook"] = {"main": [[{"node": "Check Event Token", "type": "main", "index": 0}]]}
    workflow["connections"]["Check Event Token"] = {"main": [[{"node": "Process Event", "type": "main", "index": 0}], []]}
    path.write_text(json.dumps(workflow, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
