import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { api } from '@/app/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

interface NetworkNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: 'client' | 'referral';
  value: number;
  tier: number;
  color: string;
}

interface NetworkLink extends d3.SimulationLinkDatum<NetworkNode> {
  source: string | NetworkNode;
  target: string | NetworkNode;
}

export function NetworkGraph({ userId }: { userId: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<{ nodes: NetworkNode[], edges: NetworkLink[] } | null>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [minTier, setMinTier] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // In a real app, these would be separate API calls or a combined one
      // We'll simulate the data fetching using the API client
      const graphData = await api.getNetworkGraph(userId);
      const metricsData = await api.getNetworkMetrics(userId);
      
      // If API returns empty or mock data, we ensure it matches our types
      setData(graphData);
      setMetrics(metricsData);
    } catch (error) {
      console.error("Failed to load network graph:", error);
    } finally {
      setLoading(false);
    }
  };

  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const width = 800;
    const height = 600;

    // Filter nodes based on tier
    const filteredNodes = data.nodes.filter(n => n.tier >= minTier);
    const filteredEdges = data.edges.filter(e => 
      filteredNodes.some(n => n.id === (typeof e.source === 'object' ? (e.source as NetworkNode).id : e.source)) &&
      filteredNodes.some(n => n.id === (typeof e.target === 'object' ? (e.target as NetworkNode).id : e.target))
    );

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("width", "100%")
      .attr("height", "100%")
      .style("background-color", "#f8fafc")
      .style("border-radius", "0.5rem");

    // Zoom behavior
    const g = svg.append("g");
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Simulation
    const simulation = d3.forceSimulation<NetworkNode>(filteredNodes)
      .force("link", d3.forceLink<NetworkNode, NetworkLink>(filteredEdges).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(d => (d.value / 100) + 20));

    // Links
    const link = g.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(filteredEdges)
      .join("line")
      .attr("stroke-width", 1.5);

    // Nodes
    const node = g.append("g")
      .selectAll("g")
      .data(filteredNodes)
      .join("g")
      .call(d3.drag<SVGGElement, NetworkNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))
      .on("click", (event, d) => {
        setSelectedNode(d);
        event.stopPropagation();
      });

    // Node circles
    node.append("circle")
      .attr("r", d => Math.max(5, Math.sqrt(d.value) / 2)) // Size based on value
      .attr("fill", d => d.color)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    // Node labels
    node.append("text")
      .text(d => d.name)
      .attr("x", 12)
      .attr("y", 4)
      .style("font-size", "12px")
      .style("font-family", "sans-serif")
      .style("fill", "#333")
      .style("pointer-events", "none");

    // Tooltips (simple title for now)
    node.append("title")
      .text(d => `${d.name}\nValue: $${d.value}\nTier: ${d.tier}`);

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as NetworkNode).x!)
        .attr("y1", d => (d.source as NetworkNode).y!)
        .attr("x2", d => (d.target as NetworkNode).x!)
        .attr("y2", d => (d.target as NetworkNode).y!);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [data, minTier]);

  if (loading) return <div className="h-96 flex items-center justify-center">Loading network graph...</div>;

  return (
    <div className="space-y-6">
      {/* Node Details Dialog */}
      {selectedNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedNode(null)}>
          <Card className="w-96" onClick={e => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>{selectedNode.name}</CardTitle>
              <CardDescription>{selectedNode.type === 'client' ? 'Root Client' : 'Referred Client'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">LTV</div>
                  <div className="text-xl font-bold">${selectedNode.value}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Tier</div>
                  <div className="text-xl font-bold">{selectedNode.tier}</div>
                </div>
              </div>
              <div>
                 <h4 className="font-medium mb-2">History</h4>
                 <div className="text-sm text-gray-500">
                   Joined: {new Date().toLocaleDateString()}<br/>
                   Status: Active
                 </div>
              </div>
              <Button className="w-full" onClick={() => setSelectedNode(null)}>Close</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{metrics.total_size}</div>
              <p className="text-xs text-gray-500">Total Network Size</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">${metrics.network_ltv}</div>
              <p className="text-xs text-gray-500">Network LTV</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">{metrics.virality_coefficient}x</div>
              <p className="text-xs text-gray-500">Virality Coeff.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{metrics.health_score}</div>
              <p className="text-xs text-gray-500">Health Score</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Network Visualization</CardTitle>
            <CardDescription>Interactive map of client referrals and value flow</CardDescription>
          </div>
          <div className="flex gap-2 items-center">
             <div className="flex items-center gap-2 mr-4">
               <span className="text-sm text-gray-500">Min Tier:</span>
               <select 
                 className="border rounded p-1 text-sm"
                 value={minTier}
                 onChange={(e) => setMinTier(Number(e.target.value))}
               >
                 <option value={0}>All Tiers</option>
                 <option value={1}>Tier 1+</option>
                 <option value={2}>Tier 2+</option>
               </select>
             </div>
             <Button variant="outline" size="icon" onClick={loadData}>
               <RefreshCw className="h-4 w-4" />
             </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 h-[600px] relative">
          <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing"></svg>
          <div className="absolute bottom-4 right-4 bg-white/90 p-2 rounded-lg shadow text-xs space-y-1 border">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gold" style={{backgroundColor: 'gold'}}></span>
              <span>Client (Root)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green" style={{backgroundColor: 'green'}}></span>
              <span>Referral</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
