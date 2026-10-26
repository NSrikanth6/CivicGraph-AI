# CivicGraph AI — Standalone Python FastAPI & NetworkX Service

This microservice provides high-performance graph algorithms using Python's `NetworkX` library. It can be deployed alongside or independently from the CivicGraph AI web application.

---

## 🚀 Quickstart (Local Run)

### 1. Requirements
- Python 3.10+
- pip

### 2. Setup Virtual Environment
```bash
python -m venv venv
source venv/bin/activate    # On Windows: venv\\Scripts\\activate
pip install -r requirements.txt
```

### 3. Run FastAPI with Uvicorn
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The interactive OpenAPI / Swagger documentation will be available at:
`http://localhost:8000/docs`

---

## 🐳 Docker Deployment

Build and run using Docker:
```bash
docker build -t civicgraph-networkx .
docker run -p 8000:8000 civicgraph-networkx
```

---

## 📡 API Endpoints

### 1. Health Check
`GET /health`
```json
{
  "status": "healthy",
  "service": "civicgraph-networkx",
  "networkx_version": "3.2.1"
}
```

### 2. Compute Graph Metrics
`POST /graph/metrics`
Accepts a JSON payload with `nodes` and `edges`, returning:
- Degree centrality
- Brandes betweenness centrality
- Connected components
- Louvain modularity communities
- Global graph density
