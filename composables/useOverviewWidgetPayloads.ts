import type {
  OverviewInsight,
  OverviewKpi,
  OverviewSpendRecord,
  OverviewWidgetConfig,
} from "~/types/mock";

interface WidgetSeries {
  label: string;
  color: "brand" | "product" | "interaction" | "depth";
  values: number[];
}

interface WidgetTableColumn {
  key: string;
  label: string;
}

export type OverviewWidgetPayload =
  | {
      kind: "kpi";
      kpi: OverviewKpi;
      /** Normalized 0–1 sparkline for executive tiles */
      sparkline?: number[];
    }
  | {
      kind: "chart";
      visualization: "bar" | "line" | "area" | "stacked_bar";
      labels: string[];
      series: WidgetSeries[];
      orientation?: "vertical" | "horizontal";
    }
  | {
      kind: "donut";
      segments: Array<{ label: string; value: number; color: "brand" | "product" | "interaction" | "depth" }>;
    }
  | {
      kind: "table";
      columns: WidgetTableColumn[];
      rows: Array<Record<string, string>>;
    }
  | {
      kind: "insights";
      items: OverviewInsight[];
    }
  | {
      kind: "alerts";
      items: ReturnType<typeof useAppData>["alerts"]["value"];
    }
  | {
      kind: "connections";
      summary: NonNullable<ReturnType<typeof useAppData>["overview"]["value"]>["connectionsSummary"];
    }
  | {
      kind: "signal_list";
      items: NonNullable<ReturnType<typeof useAppData>["overview"]["value"]>["prioritySignals"];
    }
  | {
      kind: "funnel";
      stages: Array<{ label: string; value: number; rateFromPrev?: number }>;
    }
  | {
      kind: "metric_delta";
      items: NonNullable<ReturnType<typeof useAppData>["overview"]["value"]>["performanceChanges"];
    };

function formatCompactCurrency(value: number) {
  return `$${value.toFixed(value >= 100 ? 0 : 1)}k`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function findKpiForWidget(
  snapshot: NonNullable<ReturnType<typeof useAppData>["overview"]["value"]>,
  widget: OverviewWidgetConfig,
) {
  const metric = widget.metric;
  const byId =
    metric === "pipeline_revenue"
      ? snapshot.kpis.find((k) => k.id === "pipeline" || k.id === "pipeline_revenue")
      : snapshot.kpis.find((k) => k.id === metric);
  return byId || snapshot.kpis.find((k) => k.label === widget.title);
}

function sparklineForMetric(
  snapshot: NonNullable<ReturnType<typeof useAppData>["overview"]["value"]>,
  rangeSize: number,
  metric: OverviewWidgetConfig["metric"],
): number[] | undefined {
  const slice = rangeSize > 0 ? snapshot.trendPoints.slice(-rangeSize) : snapshot.trendPoints;
  if (!slice.length) return undefined;
  let raw: number[] = [];
  if (metric === "spend") raw = slice.map((p) => p.spend);
  else if (metric === "revenue") raw = slice.map((p) => p.revenue);
  else if (metric === "closed_revenue") raw = slice.map((p) => p.closedRevenue);
  else if (metric === "pipeline_revenue") raw = slice.map((p) => p.pipelineRevenue);
  else if (metric === "qualified_leads") raw = slice.map((p) => p.qualifiedLeads);
  else if (metric === "roi") raw = slice.map((p) => p.revenue / Math.max(p.spend, 0.01));
  else if (metric === "cac") {
    raw = slice.map((p) => {
      if (p.cac !== undefined) return p.cac;
      return (p.spend / Math.max(p.qualifiedLeads, 1)) * 100;
    });
  } else return undefined;
  const max = Math.max(...raw, 1e-6);
  return raw.map((v) => {
    const n = Number.isFinite(v) ? v / max : 0;
    return Math.min(1, Math.max(0, n));
  });
}

function groupSpendRecords(records: OverviewSpendRecord[], by: "channel" | "vendor") {
  const groups = new Map<string, Record<string, number>>();
  for (const record of records) {
    const key = record[by];
    if (!groups.has(key)) groups.set(key, {});
    const next = groups.get(key)!;
    next[record.category] = (next[record.category] || 0) + record.amount;
  }

  const categories = [...groups.keys()];
  const stackKeys = [...new Set(records.map((record) => record.category))];

  return {
    labels: categories,
    series: stackKeys.map((stackKey, index) => ({
      label: stackKey,
      color: (["brand", "product", "interaction", "depth"][index % 4] || "product") as WidgetSeries["color"],
      values: categories.map((category) => groups.get(category)?.[stackKey] || 0),
    })),
  };
}

const DONUT_COLORS = ["brand", "product", "interaction", "depth"] as const;

export function useOverviewWidgetPayloads() {
  const { overview, alerts } = useAppData();

  function payloadFor(widget: OverviewWidgetConfig, rangeSize = 0): OverviewWidgetPayload | null {
    const snapshot = overview.value;
    if (!snapshot) return null;
    const trendPoints = rangeSize > 0 ? snapshot.trendPoints.slice(-rangeSize) : snapshot.trendPoints;
    const spendRecords = rangeSize > 0 ? snapshot.spendRecords.slice(-Math.min(snapshot.spendRecords.length, rangeSize)) : snapshot.spendRecords;

    if (widget.visualization === "kpi") {
      const kpi = findKpiForWidget(snapshot, widget);
      if (!kpi) return null;
      const sparkline = widget.metric ? sparklineForMetric(snapshot, rangeSize, widget.metric) : undefined;
      return { kind: "kpi", kpi, sparkline };
    }

    if (widget.visualization === "insights") {
      return { kind: "insights", items: snapshot.insights };
    }

    if (widget.visualization === "alerts") {
      return { kind: "alerts", items: alerts.value.slice(0, 5) };
    }

    if (widget.visualization === "connections") {
      return { kind: "connections", summary: snapshot.connectionsSummary };
    }

    if (widget.visualization === "signal_list") {
      return { kind: "signal_list", items: snapshot.prioritySignals.slice(0, 5) };
    }

    if (widget.visualization === "funnel" && widget.datasetKey === "funnel") {
      return {
        kind: "funnel",
        stages: snapshot.funnel.map((stage) => ({
          label: stage.stage,
          value: stage.value,
          rateFromPrev: stage.rateFromPrev,
        })),
      };
    }

    if (widget.visualization === "metric_delta") {
      return { kind: "metric_delta", items: snapshot.performanceChanges };
    }

    if (widget.visualization === "horizontal_bar" && widget.datasetKey === "platformSummaries") {
      const sorted = [...snapshot.platformSummaries].sort((a, b) => b.roi - a.roi);
      return {
        kind: "chart",
        visualization: "bar",
        orientation: "horizontal",
        labels: sorted.map((row) => row.platform),
        series: [
          {
            label: "ROI",
            color: "interaction",
            values: sorted.map((row) => row.roi),
          },
        ],
      };
    }

    if (widget.visualization === "table") {
      if (widget.datasetKey === "spendRecords") {
        return {
          kind: "table",
          columns: [
            { key: "date", label: "Date" },
            { key: "channel", label: "Channel" },
            { key: "vendor", label: "Vendor" },
            { key: "category", label: "Category" },
            { key: "amount", label: "Amount" },
          ],
          rows: spendRecords.map((record) => ({
            date: record.date,
            channel: record.channel,
            vendor: record.vendor,
            category: record.category,
            amount: formatCompactCurrency(record.amount),
          })),
        };
      }
      if (widget.datasetKey === "creativeLeaderboard") {
        return {
          kind: "table",
          columns: [
            { key: "name", label: "Creative" },
            { key: "spend", label: "Spend" },
            { key: "revenue", label: "Revenue" },
            { key: "roas", label: "ROAS" },
          ],
          rows: snapshot.creativeLeaderboard.map((row) => ({
            name: row.name,
            spend: formatCompactCurrency(row.spend),
            revenue: formatCompactCurrency(row.revenue),
            roas: `${row.roas.toFixed(1)}x`,
          })),
        };
      }
      if (widget.datasetKey === "performanceChanges") {
        return {
          kind: "table",
          columns: [
            { key: "label", label: "Metric" },
            { key: "delta", label: "Change" },
            { key: "period", label: "Window" },
          ],
          rows: snapshot.performanceChanges.map((row) => ({
            label: row.label,
            delta: row.delta,
            period: row.period,
          })),
        };
      }
      if (widget.datasetKey === "campaignEfficiency") {
        return {
          kind: "table",
          columns: [
            { key: "name", label: "Campaign" },
            { key: "spend", label: "Spend" },
            { key: "revenue", label: "Revenue" },
            { key: "roi", label: "ROI" },
          ],
          rows: snapshot.campaignEfficiency.map((row) => ({
            name: row.name,
            spend: formatCompactCurrency(row.spend),
            revenue: formatCompactCurrency(row.revenue),
            roi: `${row.roi.toFixed(1)}x`,
          })),
        };
      }
      if (widget.datasetKey === "creatorSummaries") {
        return {
          kind: "table",
          columns: [
            { key: "name", label: "Creator" },
            { key: "spend", label: "Spend" },
            { key: "revenue", label: "Revenue" },
            { key: "roi", label: "ROI" },
          ],
          rows: snapshot.creatorSummaries.map((row) => ({
            name: row.name,
            spend: formatCompactCurrency(row.spend),
            revenue: formatCompactCurrency(row.revenue),
            roi: `${row.roi.toFixed(1)}x`,
          })),
        };
      }
      if (widget.datasetKey === "budgetRecommendations") {
        return {
          kind: "table",
          columns: [
            { key: "action", label: "Action" },
            { key: "impact", label: "Impact" },
          ],
          rows: snapshot.budgetRecommendations.map((row) => ({
            action: row.action,
            impact: row.impact,
          })),
        };
      }
      if (widget.datasetKey === "leadSourceQuality") {
        return {
          kind: "table",
          columns: [
            { key: "source", label: "Source" },
            { key: "volume", label: "Leads" },
            { key: "pipelineQuality", label: "Quality" },
            { key: "revenue", label: "Revenue" },
          ],
          rows: snapshot.leadSourceQuality.map((row) => ({
            source: row.source,
            volume: String(row.volume),
            pipelineQuality: `${row.pipelineQuality}`,
            revenue: formatCompactCurrency(row.revenue),
          })),
        };
      }
    }

    if (widget.visualization === "donut") {
      if (widget.datasetKey === "attributionMix") {
        return {
          kind: "donut",
          segments: snapshot.attributionMix.map((row, index) => ({
            label: row.label,
            value: row.value,
            color: DONUT_COLORS[index % 4]!,
          })),
        };
      }
      if (widget.datasetKey === "revenueAttributionSplit") {
        const s = snapshot.revenueAttributionSplit;
        return {
          kind: "donut",
          segments: [
            { label: "Direct", value: s.direct, color: "brand" },
            { label: "Assisted", value: s.assisted, color: "product" },
          ],
        };
      }
      if (widget.datasetKey === "newVsReturning") {
        const n = snapshot.newVsReturning;
        return {
          kind: "donut",
          segments: [
            { label: "New", value: n.newRevenue, color: "depth" },
            { label: "Returning", value: n.returningRevenue, color: "interaction" },
          ],
        };
      }
      if (widget.datasetKey === "leadSourceSummaries") {
        const sourceRows = snapshot.leadSourceSummaries.map((row) => ({
          label: row.source,
          value:
            widget.metric === "deals"
              ? row.deals
              : widget.metric === "revenue"
                ? row.revenue
                : row.qualifiedLeads,
        }));
        return {
          kind: "donut",
          segments: sourceRows.map((row, index) => ({
            label: row.label,
            value: row.value,
            color: DONUT_COLORS[index % 4]!,
          })),
        };
      }
      const sourceRows = snapshot.platformSummaries.map((row) => ({
        label: row.platform,
        value:
          widget.metric === "spend"
            ? row.spend
            : widget.metric === "revenue"
              ? row.revenue
              : row.qualifiedLeads,
      }));
      return {
        kind: "donut",
        segments: sourceRows.map((row, index) => ({
          label: row.label,
          value: row.value,
          color: DONUT_COLORS[index % 4]!,
        })),
      };
    }

    if (widget.datasetKey === "channelCompare") {
      return {
        kind: "chart",
        visualization: "bar",
        labels: snapshot.platformSummaries.map((row) => row.platform),
        series: [
          { label: "Spend", color: "depth", values: snapshot.platformSummaries.map((row) => row.spend) },
          { label: "Revenue", color: "product", values: snapshot.platformSummaries.map((row) => row.revenue) },
        ],
      };
    }

    if (widget.datasetKey === "trendPoints") {
      if (widget.visualization === "area" && widget.source === "summary") {
        return {
          kind: "chart",
          visualization: "area",
          labels: trendPoints.map((point) => point.date),
          series: [
            { label: "Spend", color: "depth", values: trendPoints.map((point) => point.spend) },
            { label: "Revenue", color: "product", values: trendPoints.map((point) => point.revenue) },
          ],
        };
      }

      const valueKey =
        widget.metric === "qualified_leads"
          ? "qualifiedLeads"
          : widget.metric === "pipeline_revenue"
            ? "pipelineRevenue"
            : widget.metric === "closed_revenue"
              ? "closedRevenue"
              : widget.metric === "deals"
                ? "deals"
                : widget.metric === "spend"
                  ? "spend"
                  : widget.metric === "conversions"
                    ? "conversions"
                    : "revenue";

      return {
        kind: "chart",
        visualization: widget.visualization as "bar" | "line" | "area" | "stacked_bar",
        labels: trendPoints.map((point) => point.date),
        series: [
          {
            label: widget.title,
            color: widget.source === "crm_data" ? "brand" : widget.source === "spend_data" ? "depth" : "product",
            values: trendPoints.map((point) => {
              if (widget.metric === "conversions") {
                const p = point as (typeof snapshot.trendPoints)[number];
                return Number(p.conversions || 0);
              }
              return Number(point[valueKey as keyof (typeof trendPoints)[number]] || 0);
            }),
          },
        ],
      };
    }

    if (widget.datasetKey === "platformSummaries") {
      const valueKey =
        widget.metric === "spend"
          ? "spend"
          : widget.metric === "roi"
            ? "roi"
            : widget.metric === "qualified_leads"
              ? "qualifiedLeads"
              : widget.metric === "deals"
                ? "deals"
                : "revenue";

      return {
        kind: "chart",
        visualization: widget.visualization as "bar" | "line" | "area" | "stacked_bar",
        labels: snapshot.platformSummaries.map((row) => row.platform),
        series: [
          {
            label: widget.title,
            color: widget.metric === "roi" ? "interaction" : widget.metric === "spend" ? "depth" : "product",
            values: snapshot.platformSummaries.map((row) => Number(row[valueKey as keyof (typeof snapshot.platformSummaries)[number]] || 0)),
          },
        ],
      };
    }

    if (widget.datasetKey === "campaignClusters") {
      const valueKey = widget.metric === "spend" ? "spend" : widget.metric === "revenue" ? "revenue" : "roi";
      return {
        kind: "chart",
        visualization: "bar",
        labels: snapshot.campaignClusters.map((row) => row.cluster),
        series: [
          {
            label: widget.title,
            color: valueKey === "roi" ? "interaction" : valueKey === "spend" ? "depth" : "product",
            values: snapshot.campaignClusters.map((row) => Number(row[valueKey])),
          },
        ],
      };
    }

    if (widget.datasetKey === "spendRecords") {
      const grouped = groupSpendRecords(spendRecords, widget.dimension === "vendor" ? "vendor" : "channel");
      return {
        kind: "chart",
        visualization: widget.visualization as "bar" | "line" | "area" | "stacked_bar",
        labels: grouped.labels,
        series: widget.visualization === "stacked_bar"
          ? grouped.series
          : [
              {
                label: widget.title,
                color: "depth",
                values: grouped.labels.map((label, index) =>
                  grouped.series.reduce((sum, series) => sum + (series.values[index] || 0), 0),
                ),
              },
            ],
      };
    }

    if (widget.datasetKey === "funnel" && widget.visualization === "bar") {
      return {
        kind: "chart",
        visualization: "bar",
        labels: snapshot.funnel.map((stage) => stage.stage),
        series: [
          {
            label: "Funnel volume",
            color: "brand",
            values: snapshot.funnel.map((stage) => stage.value),
          },
        ],
      };
    }

    return null;
  }

  return {
    payloadFor,
    formatCompactCurrency,
    formatPercent,
  };
}
