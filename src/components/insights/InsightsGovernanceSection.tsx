// src/components/insights/InsightsGovernanceSection.tsx
// FishGate Design Constitution v1.0 - Mandatory Insights Governance: Risks, Opportunities, Recommendations, Observations

import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Flame,
  Building,
  Eye,
  Lightbulb,
} from 'lucide-react';
import {
  InsightRiskItem,
  InsightOpportunityItem,
  InsightRecommendationItem,
  InsightObservationItem,
} from './types';

interface InsightsGovernanceSectionProps {
  risks: InsightRiskItem[];
  opportunities: InsightOpportunityItem[];
  recommendations: InsightRecommendationItem[];
  observations: InsightObservationItem[];
}

export function InsightsGovernanceSection({
  risks,
  opportunities,
  recommendations,
  observations,
}: InsightsGovernanceSectionProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 pt-2">
      {/* =========================================================================
          1. RISKS & OPPORTUNITIES DUAL ROW
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risks (What is NOT working) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-800 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
              <span>Identified Risks (What Needs Attention)</span>
            </h3>
            <Badge variant="outline" className="text-[10px] bg-red-50 text-red-800 border-red-200 font-semibold">
              {risks.length} Exposure Points
            </Badge>
          </div>

          <div className="space-y-2.5">
            {risks.map((risk) => (
              <Card
                key={risk.id}
                className="p-3.5 border border-red-200/90 bg-red-50/20 hover:bg-red-50/35 transition-all shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-xs text-slate-900">{risk.title}</span>
                    <Badge
                      className={`text-[9px] uppercase font-bold py-0 ${
                        risk.severity === 'critical'
                          ? 'bg-red-600 text-white'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {risk.severity} Risk
                    </Badge>
                  </div>
                  {risk.potentialExposure && (
                    <span className="font-mono text-xs font-bold text-red-700 bg-red-100/70 px-1.5 py-0.5 rounded shrink-0">
                      {risk.potentialExposure}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
                  <strong className="text-slate-700">Root Cause: </strong>
                  {risk.rootCause}
                </p>

                <div className="pt-2 border-t border-red-100 flex items-center justify-between text-[11px] flex-wrap gap-2">
                  <span className="text-slate-500 italic">
                    Mitigation: {risk.suggestedMitigation}
                  </span>
                  {risk.actionUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] bg-white text-red-700 border-red-300 hover:bg-red-50 font-semibold gap-1 ml-auto"
                      onClick={() => navigate(risk.actionUrl!)}
                    >
                      {risk.actionLabel || 'Mitigate Risk'} <ArrowRight className="w-2.5 h-2.5" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Opportunities (What IS working & Where value can be unlocked) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Identified Opportunities (Value Unlocked)</span>
            </h3>
            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold">
              {opportunities.length} Growth Levers
            </Badge>
          </div>

          <div className="space-y-2.5">
            {opportunities.map((opp) => (
              <Card
                key={opp.id}
                className="p-3.5 border border-emerald-200/90 bg-emerald-50/20 hover:bg-emerald-50/35 transition-all shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-xs text-slate-900">{opp.title}</span>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] uppercase font-bold py-0">
                      {opp.priority.replace('_', ' ')}
                    </Badge>
                  </div>
                  {opp.estimatedGain && (
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded shrink-0">
                      +{opp.estimatedGain}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
                  <strong className="text-slate-700">Enabler: </strong>
                  {opp.enabler}
                </p>

                <div className="pt-2 border-t border-emerald-100 flex items-center justify-between text-[11px] flex-wrap gap-2">
                  <span className="text-slate-500 italic">
                    Impact: {opp.upsideStatement}
                  </span>
                  {opp.actionUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-semibold gap-1 ml-auto"
                      onClick={() => navigate(opp.actionUrl!)}
                    >
                      {opp.actionLabel || 'Capture Upside'} <ArrowRight className="w-2.5 h-2.5" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. RECOMMENDATIONS (WHAT ACTION SHOULD HAPPEN NEXT)
          ========================================================================= */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between pb-0.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-blue-600" />
            <span>Recommended Operational Actions (What to do Next)</span>
          </h3>
          <span className="text-[11px] text-slate-400">Decision-support guidance</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {recommendations.map((rec) => (
            <Card
              key={rec.id}
              className="p-3.5 border border-slate-200/90 bg-white shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <Badge
                    variant="outline"
                    className={`text-[9px] uppercase font-bold py-0 ${
                      rec.urgency === 'immediate'
                        ? 'bg-red-50 text-red-800 border-red-200'
                        : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}
                  >
                    {rec.urgency.replace('_', ' ')}
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Owner: {rec.ownerDepartment}
                  </span>
                </div>

                <h4 className="font-bold text-xs text-slate-900 leading-snug mb-1">
                  {rec.title}
                </h4>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {rec.reasoning}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 truncate">
                  Outcome: {rec.expectedOutcome}
                </span>
                {rec.actionUrl && (
                  <Button
                    size="sm"
                    className="h-6 text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1 shrink-0 px-2"
                    onClick={() => navigate(rec.actionUrl!)}
                  >
                    {rec.actionLabel || 'Execute'} <ArrowRight className="w-2.5 h-2.5" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* =========================================================================
          3. OBSERVATIONS (HUMAN OPERATIONAL CONTEXT - STRICTLY ZERO AI BUZZWORDS)
          ========================================================================= */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between pb-0.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>Operational Observations</span>
          </h3>
          <span className="text-[11px] text-slate-400">Contextual pattern analysis</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {observations.map((obs) => (
            <Card
              key={obs.id}
              className="p-3.5 border border-slate-200/90 bg-slate-50/40 text-xs shadow-2xs"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold text-xs text-slate-900 line-clamp-1">
                  {obs.title}
                </span>
                {obs.metricReference && (
                  <span className="font-mono text-[10px] font-bold text-blue-700 bg-white px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                    {obs.metricReference}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed mb-1.5">
                {obs.finding}
              </p>
              <span className="text-[10px] text-slate-400 italic block border-t border-slate-200/60 pt-1">
                {obs.operationalContext}
              </span>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
