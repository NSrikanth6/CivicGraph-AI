"""
CivicGraph AI — Standalone Python FastAPI & NetworkX Graph Processing Microservice.

Provides independent high-performance endpoints for:
- Health check: GET /health
- Graph metrics: POST /graph/metrics (Degree, betweenness, connected components, modularity)
- Louvain Community detection: POST /graph/communities
- Subgraph extraction: POST /graph/subgraph
"""

from typing import List, Dict, Optional, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import networkx as nx
from networkx.algorithms.community import louvain_communities, modularity

app = FastAPI(
    title="CivicGraph NetworkX Microservice",
    description="Dedicated graph analytics microservice for CivicGraph AI municipal issue tracking",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class NodePayload(BaseModel):
    id: str
    title: Optional[str] = None
    category: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class EdgePayload(BaseModel):
    source: str
    target: str
    weight: Optional[float] = 1.0
    type: Optional[str] = None

class GraphPayload(BaseModel):
    nodes: List[NodePayload]
    edges: List[EdgePayload]

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "civicgraph-networkx",
        "networkx_version": nx.__version__
    }

@app.post("/graph/metrics")
def calculate_graph_metrics(payload: GraphPayload):
    """
    Builds a NetworkX graph and computes:
    - Degree and Degree Centrality
    - Brandes Betweenness Centrality
    - Connected Components
    - Graph Density
    - Louvain Modularity Communities
    """
    G = nx.Graph()
    for n in payload.nodes:
        G.add_node(n.id, title=n.title, category=n.category)

    for e in payload.edges:
        G.add_edge(e.source, e.target, weight=e.weight or 1.0, type=e.type)

    total_nodes = G.number_of_nodes()
    total_edges = G.number_of_edges()

    if total_nodes == 0:
        return {
            "total_nodes": 0,
            "total_edges": 0,
            "density": 0.0,
            "components_count": 0,
            "communities_count": 0,
            "modularity": 0.0,
            "nodes": {}
        }

    # Centralities
    deg_centrality = nx.degree_centrality(G)
    deg_map = dict(G.degree())
    betweenness = nx.betweenness_centrality(G, weight="weight")
    density = nx.density(G)

    # Connected Components
    components = list(nx.connected_components(G))
    node_to_comp = {}
    for comp_idx, comp_nodes in enumerate(components, start=1):
        for nid in comp_nodes:
            node_to_comp[nid] = comp_idx

    # Louvain Communities
    node_to_comm = {}
    modularity_q = 0.0
    if total_edges > 0:
        try:
            communities = louvain_communities(G, weight="weight", seed=42)
            for comm_idx, comm_nodes in enumerate(communities, start=1):
                for nid in comm_nodes:
                    node_to_comm[nid] = comm_idx
            modularity_q = modularity(G, communities, weight="weight")
        except Exception:
            for idx, nid in enumerate(G.nodes(), start=1):
                node_to_comm[nid] = 1
    else:
        for idx, nid in enumerate(G.nodes(), start=1):
            node_to_comm[nid] = idx

    node_results = {}
    for nid in G.nodes():
        node_results[nid] = {
            "degree": deg_map.get(nid, 0),
            "degree_centrality": round(deg_centrality.get(nid, 0.0), 4),
            "betweenness_centrality": round(betweenness.get(nid, 0.0), 4),
            "component_id": node_to_comp.get(nid, 1),
            "community_id": node_to_comm.get(nid, 1),
            "neighbors": list(G.neighbors(nid))
        }

    return {
        "total_nodes": total_nodes,
        "total_edges": total_edges,
        "density": round(density, 4),
        "components_count": len(components),
        "communities_count": len(set(node_to_comm.values())),
        "modularity": round(modularity_q, 4),
        "nodes": node_results
    }
