import React, { useState, useMemo } from 'react';
import { Deal } from '../../types';
import { formatCurrency } from '../../utils/analytics';
import {
  GitMerge,
  DollarSign,
  Hash,
  AlertTriangle,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface PipelineSankeyWidgetProps {
  deals: Deal[];
  currency: string;
}

interface SankeyNode {
  id: string;
  label: string;
  sublabel?: string;
  col: number;
  value: number;
  dealCount: number;
  totalDollars: number;
  type: 'intake' | 'stage' | 'outcome_won' | 'outcome_lost' | 'outcome_open';
  color: string;
  stageName?: string;
  stageIdx?: number;
}

interface SankeyLink {
  id: string;
  source: string;
  target: string;
  value: number;
  dealCount: number;
  totalDollars: number;
  color: string;
  type: 'advance' | 'won' | 'lost' | 'open' | 'intake';
  sourceName: string;
  targetName: string;
}

export const PipelineSankeyWidget: React.FC<PipelineSankeyWidgetProps> = ({
  deals,
  currency,
}) => {
  const [metricMode, setMetricMode] = useState<'value' | 'count'>('value');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<SankeyLink | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // 1. Determine natural stage ordering from deals
  const orderedStages = useMemo(() => {
    const rawStages = new Set<string>();
    deals.forEach((d) => {
      const st = d.dealStage.trim();
      if (st && st !== 'Closed Won' && st !== 'Closed Lost') {
        rawStages.add(st);
      }
    });

    const knownRank: Record<string, number> = {
      discovery: 10,
      initial: 12,
      qualification: 20,
      qualified: 22,
      'proposal sent': 30,
      'proposol sent': 31,
      quote: 32,
      negotiation: 40,
      review: 45,
    };

    const sorted = Array.from(rawStages).sort((a, b) => {
      const rA = knownRank[a.toLowerCase()] ?? 50;
      const rB = knownRank[b.toLowerCase()] ?? 50;
      return rA - rB;
    });

    return sorted.length > 0 ? sorted : ['Discovery', 'Qualified', 'Proposal Sent', 'Negotiation'];
  }, [deals]);

  // 2. Compute Sankey Flow Graph Data
  const { nodes, links, stageDropOffs, totalIntakeValue, totalIntakeCount } = useMemo(() => {
    const stageIndexMap = new Map<string, number>();
    orderedStages.forEach((st, idx) => stageIndexMap.set(st, idx));

    const stageMetrics = orderedStages.map((st) => ({
      stage: st,
      openValue: 0,
      openCount: 0,
      wonValue: 0,
      wonCount: 0,
      lostValue: 0,
      lostCount: 0,
    }));

    let grandTotalVal = 0;
    let grandTotalCnt = 0;

    deals.forEach((d) => {
      const val = Math.max(0, d.dealValue || 0);
      grandTotalVal += val;
      grandTotalCnt += 1;

      const st = d.dealStage.trim();
      const idx = stageIndexMap.get(st);

      if (idx !== undefined) {
        if (d.isWon) {
          stageMetrics[idx].wonValue += val;
          stageMetrics[idx].wonCount += 1;
        } else if (d.isLost) {
          stageMetrics[idx].lostValue += val;
          stageMetrics[idx].lostCount += 1;
        } else {
          stageMetrics[idx].openValue += val;
          stageMetrics[idx].openCount += 1;
        }
      } else {
        if (d.isWon) {
          stageMetrics[0].wonValue += val;
          stageMetrics[0].wonCount += 1;
        } else if (d.isLost) {
          stageMetrics[0].lostValue += val;
          stageMetrics[0].lostCount += 1;
        } else {
          stageMetrics[0].openValue += val;
          stageMetrics[0].openCount += 1;
        }
      }
    });

    // Compute volume entering each stage
    // Rule:
    // - Closed Won deals pass through ALL stages (from intake -> stage 0 -> stage 1 ... -> stage N-1 -> Closed Won)
    // - Active Open deals pass through stages up to their current stage k, where they drop off to Active Open (top)
    // - Closed Lost deals pass through stages up to stage k where they were lost, where they drop off to Closed Lost (bottom)

    let totalWonVal = 0;
    let totalWonCnt = 0;

    deals.forEach((d) => {
      if (d.isWon) {
        totalWonVal += Math.max(0, d.dealValue || 0);
        totalWonCnt += 1;
      }
    });

    const stageEnteringValue: number[] = new Array(orderedStages.length).fill(0);
    const stageEnteringCount: number[] = new Array(orderedStages.length).fill(0);

    for (let i = 0; i < orderedStages.length; i++) {
      let sumOpenVal = 0, sumOpenCnt = 0;
      let sumLostVal = 0, sumLostCnt = 0;

      for (let j = i; j < orderedStages.length; j++) {
        const sm = stageMetrics[j];
        sumOpenVal += sm.openValue;
        sumOpenCnt += sm.openCount;
        sumLostVal += sm.lostValue;
        sumLostCnt += sm.lostCount;
      }

      stageEnteringValue[i] = totalWonVal + sumOpenVal + sumLostVal;
      stageEnteringCount[i] = totalWonCnt + sumOpenCnt + sumLostCnt;
    }

    const sankeyNodes: SankeyNode[] = [];
    const sankeyLinks: SankeyLink[] = [];

    // Node 0: Pipeline Intake
    sankeyNodes.push({
      id: 'node_intake',
      label: 'Pipeline Intake',
      col: 0,
      value: metricMode === 'value' ? grandTotalVal : grandTotalCnt,
      dealCount: grandTotalCnt,
      totalDollars: grandTotalVal,
      type: 'intake',
      color: '#3f7abb',
    });

    // Stage Nodes and Stage-Specific Outcome Nodes
    orderedStages.forEach((st, idx) => {
      const sm = stageMetrics[idx];
      const enteringV = stageEnteringValue[idx];
      const enteringC = stageEnteringCount[idx];
      const val = metricMode === 'value' ? enteringV : enteringC;

      // Main Stage Node
      sankeyNodes.push({
        id: `node_stage_${idx}`,
        label: st,
        col: idx + 1,
        value: val,
        dealCount: enteringC,
        totalDollars: enteringV,
        type: 'stage',
        color: '#2a5a9e',
        stageName: st,
        stageIdx: idx,
      });

      // Stage Active Open Node (Top branch)
      if (sm.openValue > 0 || sm.openCount > 0) {
        const openVal = metricMode === 'value' ? sm.openValue : sm.openCount;
        sankeyNodes.push({
          id: `node_stage_open_${idx}`,
          label: st,
          sublabel: 'Active Open',
          col: idx + 1,
          value: openVal,
          dealCount: sm.openCount,
          totalDollars: sm.openValue,
          type: 'outcome_open',
          color: '#38bdf8',
          stageName: st,
          stageIdx: idx,
        });
      }

      // Stage Closed Lost Node (Bottom branch)
      if (sm.lostValue > 0 || sm.lostCount > 0) {
        const lostVal = metricMode === 'value' ? sm.lostValue : sm.lostCount;
        sankeyNodes.push({
          id: `node_stage_lost_${idx}`,
          label: st,
          sublabel: 'Closed Lost',
          col: idx + 1,
          value: lostVal,
          dealCount: sm.lostCount,
          totalDollars: sm.lostValue,
          type: 'outcome_lost',
          color: '#ef4444',
          stageName: st,
          stageIdx: idx,
        });
      }
    });

    // Final Outcome Node: Closed Won (Final Column)
    const finalCol = orderedStages.length + 1;
    sankeyNodes.push({
      id: 'node_outcome_won',
      label: 'Closed Won',
      sublabel: 'Full Conversion',
      col: finalCol,
      value: metricMode === 'value' ? totalWonVal : totalWonCnt,
      dealCount: totalWonCnt,
      totalDollars: totalWonVal,
      type: 'outcome_won',
      color: '#ecdf51',
    });

    // LINK CREATION:
    // 1. Intake -> Stage 0
    if (orderedStages.length > 0) {
      const initialVal = metricMode === 'value' ? stageEnteringValue[0] : stageEnteringCount[0];
      sankeyLinks.push({
        id: 'link_intake_stage0',
        source: 'node_intake',
        target: 'node_stage_0',
        value: initialVal,
        dealCount: stageEnteringCount[0],
        totalDollars: stageEnteringValue[0],
        color: '#3f7abb',
        type: 'intake',
        sourceName: 'Pipeline Intake',
        targetName: orderedStages[0],
      });
    }

    // 2. Outgoing links per Stage in STACK ORDER:
    // 1) Active Open (Top drop-off -> node_stage_open_{idx})
    // 2) Advance to next stage / Closed Won (Middle flow -> node_stage_{k+1} or node_outcome_won)
    // 3) Closed Lost (Bottom drop-off -> node_stage_lost_{idx})

    const dropOffSummaries: any[] = [];

    orderedStages.forEach((st, idx) => {
      const sm = stageMetrics[idx];
      const sourceId = `node_stage_${idx}`;
      const nextStageId = idx < orderedStages.length - 1 ? `node_stage_${idx + 1}` : null;

      const enteringV = stageEnteringValue[idx];
      const enteringC = stageEnteringCount[idx];

      const advanceV = idx < orderedStages.length - 1 ? stageEnteringValue[idx + 1] : totalWonVal;
      const advanceC = idx < orderedStages.length - 1 ? stageEnteringCount[idx + 1] : totalWonCnt;

      // 1. TOP BRANCH: Active Open deals sitting at this stage
      if (sm.openValue > 0 || sm.openCount > 0) {
        const val = metricMode === 'value' ? sm.openValue : sm.openCount;
        sankeyLinks.push({
          id: `link_stage_${idx}_open`,
          source: sourceId,
          target: `node_stage_open_${idx}`,
          value: val,
          dealCount: sm.openCount,
          totalDollars: sm.openValue,
          color: '#38bdf8',
          type: 'open',
          sourceName: st,
          targetName: `${st} Active Open`,
        });
      }

      // 2. MIDDLE BRANCH: Advance to next stage (or to Closed Won if final stage)
      if (nextStageId) {
        if (advanceV > 0 || advanceC > 0) {
          const val = metricMode === 'value' ? advanceV : advanceC;
          sankeyLinks.push({
            id: `link_stage_${idx}_next`,
            source: sourceId,
            target: nextStageId,
            value: val,
            dealCount: advanceC,
            totalDollars: advanceV,
            color: '#3b82f6',
            type: 'advance',
            sourceName: st,
            targetName: orderedStages[idx + 1],
          });
        }
      } else {
        // Final stage -> Closed Won
        if (totalWonVal > 0 || totalWonCnt > 0) {
          const val = metricMode === 'value' ? totalWonVal : totalWonCnt;
          sankeyLinks.push({
            id: `link_stage_${idx}_won`,
            source: sourceId,
            target: 'node_outcome_won',
            value: val,
            dealCount: totalWonCnt,
            totalDollars: totalWonVal,
            color: '#ecdf51',
            type: 'won',
            sourceName: st,
            targetName: 'Closed Won',
          });
        }
      }

      // 3. BOTTOM BRANCH: Closed Lost deals dropped off at this stage
      if (sm.lostValue > 0 || sm.lostCount > 0) {
        const val = metricMode === 'value' ? sm.lostValue : sm.lostCount;
        sankeyLinks.push({
          id: `link_stage_${idx}_lost`,
          source: sourceId,
          target: `node_stage_lost_${idx}`,
          value: val,
          dealCount: sm.lostCount,
          totalDollars: sm.lostValue,
          color: '#ef4444',
          type: 'lost',
          sourceName: st,
          targetName: `${st} Closed Lost`,
        });
      }

      dropOffSummaries.push({
        stage: st,
        enteringVal: enteringV,
        enteringCount: enteringC,
        lostVal: sm.lostValue,
        lostCount: sm.lostCount,
        wonVal: sm.wonValue,
        wonCount: sm.wonCount,
        openVal: sm.openValue,
        openCount: sm.openCount,
        advanceVal: advanceV,
        advanceCount: advanceC,
        dropOffRateVal: enteringV > 0 ? (sm.lostValue / enteringV) * 100 : 0,
      });
    });

    return {
      nodes: sankeyNodes,
      links: sankeyLinks,
      stageDropOffs: dropOffSummaries,
      totalIntakeValue: grandTotalVal,
      totalIntakeCount: grandTotalCnt,
    };
  }, [deals, orderedStages, metricMode]);

  // 3. Layout Mathematics for Clean Non-Overlapping Canvas
  const svgLayout = useMemo(() => {
    const width = 1180;
    const height = 520;
    const paddingX = 75;
    const nodeWidth = 26;

    const maxCol = Math.max(...nodes.map((n) => n.col));
    const colWidth = (width - 2 * paddingX - nodeWidth) / Math.max(1, maxCol);

    const nodePositions: Map<
      string,
      { x: number; y: number; h: number; sourceOffsets: number; targetOffsets: number }
    > = new Map();

    const maxIntakeVal = nodes.find((n) => n.id === 'node_intake')?.value || 1;
    const MAX_BAR_HEIGHT = 240;
    const centerY = 250;

    // Position each node explicitly
    nodes.forEach((node) => {
      let x = paddingX + node.col * colWidth;
      const valRatio = maxIntakeVal > 0 ? node.value / maxIntakeVal : 0;
      const h = Math.max(2, valRatio * MAX_BAR_HEIGHT);

      if (node.type === 'intake') {
        nodePositions.set(node.id, { x, y: centerY - h / 2, h, sourceOffsets: 0, targetOffsets: 0 });
      } else if (node.type === 'stage') {
        nodePositions.set(node.id, { x, y: centerY - h / 2, h, sourceOffsets: 0, targetOffsets: 0 });
      } else if (node.type === 'outcome_open') {
        // TOP BRANCH (Aligned with stage, shifted 38% towards next col)
        x = paddingX + node.col * colWidth + colWidth * 0.38;
        const y = 55 - h / 2;
        nodePositions.set(node.id, { x, y, h, sourceOffsets: 0, targetOffsets: 0 });
      } else if (node.type === 'outcome_lost') {
        // BOTTOM BRANCH (Aligned with stage, shifted 38% towards next col)
        x = paddingX + node.col * colWidth + colWidth * 0.38;
        const y = 445 - h / 2;
        nodePositions.set(node.id, { x, y, h, sourceOffsets: 0, targetOffsets: 0 });
      } else if (node.type === 'outcome_won') {
        // FINAL COLUMN (Middle)
        nodePositions.set(node.id, { x, y: centerY - h / 2, h, sourceOffsets: 0, targetOffsets: 0 });
      }
    });

    // Compute Bezier Ribbon Paths
    const computedLinks = links.map((link) => {
      const srcPos = nodePositions.get(link.source);
      const tgtPos = nodePositions.get(link.target);

      if (!srcPos || !tgtPos) {
        return { ...link, path: '' };
      }

      // Proportional ribbon thickness based strictly on total intake
      const linkHeightSrc = Math.max(1.5, (link.value / maxIntakeVal) * MAX_BAR_HEIGHT);
      const linkHeightTgt = linkHeightSrc;

      const y1Src = srcPos.y + srcPos.sourceOffsets;
      const y2Src = y1Src + linkHeightSrc;

      const y1Tgt = tgtPos.y + tgtPos.targetOffsets;
      const y2Tgt = y1Tgt + linkHeightTgt;

      srcPos.sourceOffsets += linkHeightSrc;
      tgtPos.targetOffsets += linkHeightTgt;

      const x1 = srcPos.x + nodeWidth;
      const x2 = tgtPos.x;

      const dx = (x2 - x1) * 0.45;
      const path = `
        M ${x1} ${y1Src}
        C ${x1 + dx} ${y1Src}, ${x2 - dx} ${y1Tgt}, ${x2} ${y1Tgt}
        L ${x2} ${y2Tgt}
        C ${x2 - dx} ${y2Tgt}, ${x1 + dx} ${y2Src}, ${x1} ${y2Src}
        Z
      `;

      return {
        ...link,
        path,
      };
    });

    return {
      width,
      height,
      nodeWidth,
      nodePositions,
      computedLinks,
    };
  }, [nodes, links]);

  // Selected Node Details Modal
  const selectedNodeDeals = useMemo(() => {
    if (!selectedNodeId) return null;
    const node = nodes.find((n) => n.id === selectedNodeId);
    if (!node) return null;

    let filtered: Deal[] = [];
    if (node.type === 'intake') {
      filtered = deals;
    } else if (node.type === 'stage') {
      filtered = deals.filter((d) => d.dealStage.trim() === node.stageName);
    } else if (node.type === 'outcome_won') {
      filtered = deals.filter((d) => d.isWon);
    } else if (node.type === 'outcome_lost') {
      filtered = deals.filter((d) => d.dealStage.trim() === node.stageName && d.isLost);
    } else if (node.type === 'outcome_open') {
      filtered = deals.filter((d) => d.dealStage.trim() === node.stageName && d.isOpen);
    }

    return { node, deals: filtered };
  }, [selectedNodeId, nodes, deals]);

  return (
    <div className="bg-[#122852] border border-[#3f7abb]/30 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3f7abb]/20">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-[#0d2045] rounded-xl text-[#ecdf51] border border-[#3f7abb]/40 shadow-inner">
            <GitMerge className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-bold text-white tracking-tight">Sales Pipeline Sankey Flow</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#ecdf51]/20 text-[#ecdf51] border border-[#ecdf51]/40 uppercase tracking-wider">
                Stage & Drop-off Tracker
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Visualize how deal value and volume flow through each stage and where conversions & drop-offs occur
            </p>
          </div>
        </div>

        {/* Metric Switcher */}
        <div className="flex items-center space-x-2 bg-[#0d2045] p-1 rounded-xl border border-[#3f7abb]/40">
          <button
            onClick={() => setMetricMode('value')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              metricMode === 'value'
                ? 'bg-[#3f7abb] text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Deal Value ($)</span>
          </button>
          <button
            onClick={() => setMetricMode('count')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              metricMode === 'count'
                ? 'bg-[#3f7abb] text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Deal Count (#)</span>
          </button>
        </div>
      </div>

      {/* Sankey Canvas */}
      <div className="bg-[#0d2045] border border-[#3f7abb]/30 rounded-xl p-4 overflow-x-auto relative">
        <div className="min-w-[900px]">
          <svg
            viewBox={`0 0 ${svgLayout.width} ${svgLayout.height}`}
            className="w-full h-auto overflow-visible select-none"
          >
            <defs>
              <linearGradient id="grad_advance" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3f7abb" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.6" />
              </linearGradient>

              <linearGradient id="grad_won" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3f7abb" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#ecdf51" stopOpacity="0.75" />
              </linearGradient>

              <linearGradient id="grad_lost" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3f7abb" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.75" />
              </linearGradient>

              <linearGradient id="grad_open" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3f7abb" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.65" />
              </linearGradient>

              <filter id="shadow_glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.5" />
              </filter>
            </defs>

            {/* FLOW RIBBONS (LINKS) */}
            <g className="sankey-links">
              {svgLayout.computedLinks.map((link) => {
                const isHovered =
                  hoveredLink?.id === link.id ||
                  hoveredNode === link.source ||
                  hoveredNode === link.target;

                let fillGradient = 'url(#grad_advance)';
                if (link.type === 'won') fillGradient = 'url(#grad_won)';
                else if (link.type === 'lost') fillGradient = 'url(#grad_lost)';
                else if (link.type === 'open') fillGradient = 'url(#grad_open)';

                return (
                  <path
                    key={link.id}
                    d={link.path}
                    fill={fillGradient}
                    className="transition-all duration-200 cursor-pointer"
                    style={{
                      opacity: hoveredNode || hoveredLink ? (isHovered ? 0.9 : 0.12) : 0.6,
                      filter: isHovered ? 'url(#shadow_glow)' : 'none',
                    }}
                    onMouseEnter={() => setHoveredLink(link)}
                    onMouseLeave={() => setHoveredLink(null)}
                  />
                );
              })}
            </g>

            {/* SANKEY NODES */}
            <g className="sankey-nodes">
              {nodes.map((node) => {
                const pos = svgLayout.nodePositions.get(node.id);
                if (!pos) return null;

                const isHovered =
                  hoveredNode === node.id ||
                  hoveredLink?.source === node.id ||
                  hoveredLink?.target === node.id;

                const percentOfIntake =
                  totalIntakeValue > 0 && metricMode === 'value'
                    ? ((node.totalDollars / totalIntakeValue) * 100).toFixed(0)
                    : totalIntakeCount > 0
                    ? ((node.dealCount / totalIntakeCount) * 100).toFixed(0)
                    : '0';

                // Label positions relative to node box
                const valY = pos.y + pos.h + 16;
                const pctY = pos.y + pos.h + 28;

                return (
                  <g
                    key={node.id}
                    className="cursor-pointer group"
                    onClick={() => setSelectedNodeId(node.id)}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    {/* Bar */}
                    <rect
                      x={pos.x}
                      y={pos.y}
                      width={svgLayout.nodeWidth}
                      height={pos.h}
                      rx={6}
                      fill={node.color}
                      className="transition-all duration-200"
                      stroke={isHovered ? '#ffffff' : '#0d2045'}
                      strokeWidth={isHovered ? 2 : 1}
                      style={{
                        filter: isHovered ? 'drop-shadow(0 0 10px rgba(236,223,81,0.7))' : 'none',
                      }}
                    />

                    {/* Stage Label & Sublabel Above */}
                    {node.sublabel ? (
                      <>
                        <text
                          x={pos.x + svgLayout.nodeWidth / 2}
                          y={pos.y - 18}
                          textAnchor="middle"
                          className="fill-white text-[10px] font-bold tracking-tight pointer-events-none"
                        >
                          {node.label}
                        </text>
                        <text
                          x={pos.x + svgLayout.nodeWidth / 2}
                          y={pos.y - 7}
                          textAnchor="middle"
                          className={`text-[9px] font-extrabold uppercase tracking-wider pointer-events-none ${
                            node.type === 'outcome_open'
                              ? 'fill-[#38bdf8]'
                              : node.type === 'outcome_lost'
                              ? 'fill-red-400'
                              : 'fill-[#ecdf51]'
                          }`}
                        >
                          {node.sublabel}
                        </text>
                      </>
                    ) : (
                      <text
                        x={pos.x + svgLayout.nodeWidth / 2}
                        y={pos.y - 10}
                        textAnchor="middle"
                        className="fill-white text-[11px] font-bold tracking-tight pointer-events-none"
                      >
                        {node.label}
                      </text>
                    )}

                    {/* Value Below */}
                    <text
                      x={pos.x + svgLayout.nodeWidth / 2}
                      y={valY}
                      textAnchor="middle"
                      className="fill-slate-200 text-[10px] font-semibold pointer-events-none"
                    >
                      {metricMode === 'value'
                        ? formatCurrency(node.totalDollars, currency)
                        : `${node.dealCount} deals`}
                    </text>

                    {/* Percent Below Value */}
                    <text
                      x={pos.x + svgLayout.nodeWidth / 2}
                      y={pctY}
                      textAnchor="middle"
                      className={`text-[9px] font-bold pointer-events-none ${
                        node.type === 'outcome_won'
                          ? 'fill-[#ecdf51]'
                          : node.type === 'outcome_lost'
                          ? 'fill-red-400'
                          : 'fill-slate-400'
                      }`}
                    >
                      ({percentOfIntake}%)
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Hover Tooltip */}
        {(hoveredLink || hoveredNode) && (
          <div className="absolute top-4 right-4 bg-[#122852] border border-[#ecdf51]/60 rounded-xl p-3 shadow-2xl text-xs text-white max-w-xs space-y-1.5 z-10 pointer-events-none backdrop-blur-md">
            {hoveredLink && (
              <>
                <div className="flex items-center space-x-1.5 font-bold text-[#ecdf51] border-b border-[#3f7abb]/30 pb-1">
                  <span>
                    {hoveredLink.sourceName} &rarr; {hoveredLink.targetName}
                  </span>
                </div>
                <div className="flex justify-between text-slate-200">
                  <span>Flow Volume:</span>
                  <span className="font-extrabold text-white">
                    {formatCurrency(hoveredLink.totalDollars, currency)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Deal Count:</span>
                  <span className="font-bold">{hoveredLink.dealCount} deals</span>
                </div>
                {totalIntakeValue > 0 && (
                  <div className="flex justify-between text-slate-400 text-[10px] pt-1 border-t border-[#3f7abb]/20">
                    <span>Share of Pipeline:</span>
                    <span className="text-[#ecdf51] font-bold">
                      {((hoveredLink.totalDollars / totalIntakeValue) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </>
            )}

            {!hoveredLink && hoveredNode && (
              (() => {
                const n = nodes.find((node) => node.id === hoveredNode);
                if (!n) return null;
                return (
                  <>
                    <div className="font-bold text-[#ecdf51] border-b border-[#3f7abb]/30 pb-1 flex items-center justify-between">
                      <span>{n.label}</span>
                      <span className="text-[10px] text-slate-300 font-normal">Click to drill down</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Value:</span>
                      <span className="font-extrabold text-white">
                        {formatCurrency(n.totalDollars, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Total Deals:</span>
                      <span className="font-bold">{n.dealCount} deals</span>
                    </div>
                  </>
                );
              })()
            )}
          </div>
        )}
      </div>

      {/* Stage-by-Stage Breakdown Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>Stage-by-Stage Drop-off & Conversion Breakdown</span>
          </h4>
          <span className="text-xs text-slate-400">
            Click any node bar above for deal level drilldown
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {stageDropOffs.map((sd) => {
            const isHighDrop = sd.dropOffRateVal > 25;
            return (
              <div
                key={sd.stage}
                className="bg-[#0d2045] p-3.5 rounded-xl border border-[#3f7abb]/30 space-y-2 hover:border-[#3f7abb] transition-all"
              >
                <div className="flex items-center justify-between border-b border-[#3f7abb]/20 pb-1.5">
                  <span className="text-xs font-bold text-white">{sd.stage}</span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {sd.enteringCount} deals entering
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="block text-slate-400 text-[10px]">Entering Volume</span>
                    <span className="font-bold text-white">
                      {formatCurrency(sd.enteringVal, currency)}
                    </span>
                  </div>

                  <div>
                    <span className="block text-slate-400 text-[10px]">Direct Lost (Drop-off)</span>
                    <span className="font-bold text-red-400">
                      {formatCurrency(sd.lostVal, currency)}
                    </span>
                  </div>
                </div>

                {/* Drop-off Rate Meter */}
                <div className="space-y-1 pt-1 border-t border-[#3f7abb]/20">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">Drop-off Rate</span>
                    <span className={`font-bold ${isHighDrop ? 'text-red-400' : 'text-slate-300'}`}>
                      {sd.dropOffRateVal.toFixed(1)}% (${formatCurrency(sd.lostVal, currency)})
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#122852] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isHighDrop ? 'bg-red-500' : 'bg-[#3f7abb]'}`}
                      style={{ width: `${Math.min(100, sd.dropOffRateVal)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Node Deal Drilldown Modal */}
      {selectedNodeDeals && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#122852] border border-[#3f7abb]/50 rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#3f7abb]/30 pb-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-[#ecdf51]" />
                <h3 className="text-lg font-bold text-white">
                  Deals at Stage: {selectedNodeDeals.node.label}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#3f7abb]/20 text-[#ecdf51] border border-[#3f7abb]/40">
                  {selectedNodeDeals.deals.length} deals (
                  {formatCurrency(selectedNodeDeals.node.totalDollars, currency)})
                </span>
              </div>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="p-1.5 hover:bg-[#0d2045] rounded-xl text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {selectedNodeDeals.deals.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No deals found for this selection.
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-200">
                  <thead className="bg-[#0d2045] text-slate-400 font-semibold sticky top-0">
                    <tr>
                      <th className="p-2.5 rounded-l-lg">Deal ID</th>
                      <th className="p-2.5">Client Name</th>
                      <th className="p-2.5">Sales Rep</th>
                      <th className="p-2.5">Stage</th>
                      <th className="p-2.5 text-right">Value</th>
                      <th className="p-2.5 text-center rounded-r-lg">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3f7abb]/20">
                    {selectedNodeDeals.deals.map((d) => (
                      <tr key={d.id} className="hover:bg-[#0d2045]/60 transition-colors">
                        <td className="p-2.5 font-bold text-white">{d.id}</td>
                        <td className="p-2.5 font-semibold text-white">{d.clientName}</td>
                        <td className="p-2.5 text-slate-300">{d.salesRep || 'Unassigned'}</td>
                        <td className="p-2.5 text-slate-300">{d.dealStage}</td>
                        <td className="p-2.5 text-right font-extrabold text-white">
                          {formatCurrency(d.dealValue, currency)}
                        </td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              d.isWon
                                ? 'bg-[#ecdf51]/20 text-[#ecdf51] border border-[#ecdf51]/40'
                                : d.isLost
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {d.dealStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-2 border-t border-[#3f7abb]/30 flex justify-end">
              <button
                onClick={() => setSelectedNodeId(null)}
                className="px-4 py-2 bg-[#3f7abb] hover:bg-[#3f7abb]/80 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
