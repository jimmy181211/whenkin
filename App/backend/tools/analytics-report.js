import { ANALYTICS_CHART_SCRIPT } from './analytics-chart-script.js';

/** Builds the local HTML report from the existing analysis results. */
/**
 * Escape text before placing it in the report's HTML.
 * @returns Safe text for HTML content or quoted attributes, using NULL for missing values.
 */
const escape = (value) =>
  String(value ?? 'NULL')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/**
 * Render existing analysis as a standalone HTML report, escaping displayed values.
 * @param columns - Event-table fields, in the same order as the CSV export.
 * @returns HTML text; file writing is handled by writeAnalysis.
 */
export function renderAnalysisReport(result, columns) {
  const cards = [
    [
      '活动数',
      result.summary.events,
    ],
    [
      '回复数',
      result.summary.responses,
    ],
    [
      '回复人数中位数',
      result.summary.median_responses,
    ],
    [
      '多人活动有共同时间',
      result.summary.multiple_response_events_with_shared_time +
        ' / ' +
        result.summary.multiple_response_events,
    ],
    [
      '零回复活动',
      result.summary.zero_response_events,
    ],
    [
      '保留 / 剔除',
      result.summary.retained_events + ' / 0',
    ],
  ];
  const methods = [
    [
      '创建量、创建星期和小时',
      '了解使用频率、创建高峰；小时按活动时区，日期表按 UTC，时区不代表所在地。',
    ],
    [
      '回复人数及零／单人回复比例',
      '了解协调规模；每条回复是一条记录，不保证对应唯一自然人。',
    ],
    [
      '备选日期、开放时长和提前天数',
      '了解安排习惯；星期模式没有实际活动日期，提前天数为 NULL。开放时长按时间区间并集计算。',
    ],
    [
      '共同时间总长、最长连续时段、覆盖比例',
      '了解协调结果；所有回复者都纳入，空白回复会影响交集。无回复时为 NULL，有回复但无交集时为 0。',
    ],
    [
      '回复人数与共同时间的散点图',
      '观察人数增加与共同时间的关系，不将相关性解释为因果。',
    ],
    [
      '共同空闲的星期和小时分布',
      '按活动的时区汇总总分钟数；星期模式使用活动的共同钟面时间。',
    ],
    [
      '创建者及首次回复耗时',
      '创建者身份、实际所在地和首次回复时间均未记录，保持 NULL；现有 organizer_name 仅表示填写过一个标签，不能识别创建者；updated_at 不能代替首次回复时间。',
    ],
  ];
  const html = /* HTML */ `<!doctype html>
    <html lang="zh-CN"
      ><meta charset="utf-8" /><meta
        name="viewport"
        content="width=device-width,initial-scale=1"
      /><title>Whenkin 使用分析</title
      ><style>
        * {
          box-sizing: border-box;
        }
        body {
          font: 15px/1.65 system-ui;
          background: #f4f7f1;
          color: #183e35;
          margin: 0;
        }
        main {
          max-width: 1200px;
          margin: auto;
          padding: 34px 24px;
        }
        h1 {
          font-size: 32px;
          margin: 0;
        }
        h2 {
          font-size: 20px;
          margin: 0 0 12px;
        }
        .meta,
        p {
          color: #52695f;
        }
        .cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin: 24px 0;
        }
        .card,
        section {
          background: white;
          border: 1px solid #dbe5d6;
          border-radius: 14px;
          padding: 22px;
          margin-bottom: 18px;
        }
        .card {
          margin: 0;
        }
        .card strong {
          font-size: 27px;
          display: block;
        }
        .plots {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }
        .plots section {
          min-width: 0;
        }
        svg {
          display: block;
          width: 100%;
          height: auto;
        }
        circle {
          fill: #1e7869;
          opacity: 0.7;
          cursor: help;
        }
        circle.flag {
          fill: #be6337;
        }
        path.null {
          stroke: #6c7782;
          stroke-width: 1.8;
          cursor: help;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          font-size: 12px;
        }
        th,
        td {
          text-align: left;
          padding: 9px;
          border-bottom: 1px solid #e4e9df;
          white-space: nowrap;
        }
        th {
          position: sticky;
          top: 0;
          background: #eef4e9;
        }
        tr.flagged {
          background: #fff8ed;
        }
        .table {
          max-height: 560px;
          overflow: auto;
        }
        code {
          background: #f1f4ed;
          padding: 2px 5px;
        }
        small {
          color: #65786e;
        }
        dl dt {
          font-weight: 650;
          margin-top: 12px;
        }
        dl dd {
          margin: 3px 0 0;
          color: #52695f;
        }
        .bars {
          max-width: 850px;
        }
        .bar {
          display: grid;
          grid-template-columns: minmax(130px, 1fr) 3fr 55px;
          gap: 12px;
          align-items: center;
          margin: 6px 0;
        }
        .bar i {
          display: block;
          height: 13px;
          background: #288674;
          border-radius: 3px;
        }
        button {
          border: 1px solid #bfd1bf;
          padding: 7px 12px;
          border-radius: 8px;
          background: #eef5e9;
          color: #183e35;
        }
        #tip {
          position: fixed;
          display: none;
          max-width: 280px;
          padding: 12px;
          background: #153e34;
          color: white;
          border-radius: 9px;
          pointer-events: none;
          font-size: 12px;
          z-index: 20;
        }
        @media (max-width: 700px) {
          .cards {
            grid-template-columns: 1fr 1fr;
          }
          .plots {
            display: block;
          }
          main {
            padding: 22px 12px;
          }
        }</style
      ><main
        ><h1>Whenkin 使用分析</h1
        ><p class="meta"
          >只读统计（含活动标题） · 快照
          ${escape(
            new Intl.DateTimeFormat('zh-CN', {
              timeZone: 'America/Los_Angeles',
              dateStyle: 'full',
              timeStyle: 'short',
            }).format(new Date(result.extracted_at)),
          )}（洛杉矶）
          · Whenkin 生产库只读快照</p
        ><p
          >全部记录保留。橙色点仅表示需要复核的统计离群值；灰色 × 表示
          NULL，放在独立的缺失值区域，不当作
          0。重叠点仅作少量像素错位以便查看，数值没有改变。此报告仅保存在本机。</p
        >
        <div class="cards"
          >${cards
            .map(
              /** Render an escaped summary card for each label and value. */
              ([label, value]) =>
                '<div class="card">' +
                escape(label) +
                '<strong>' +
                escape(value) +
                '</strong></div>',
            )
            .join('')}</div
        >
        <section
          ><h2>活动主题比较</h2
          ><p
            >标签来自标题中的词语，仅描述活动主题，不认定回复者身份。一个活动可有多个标签；未分类记录仍然保留。匹配词可在下方数据表核查。</p
          ><label
            >活动标签
            <select id="topic-filter" aria-label="活动标签"
              ><option value="all">全部活动</option></select
            ></label
          ><p id="topic-counts"></p
        ></section>
        <div class="plots"
          ><section
            ><h2>回复人数与共同空闲时长</h2
            ><div id="plot-common"></div></section
          ><section
            ><h2>提前安排天数与回复人数</h2><div id="plot-lead"></div></section
          ><section
            ><h2>创建小时与回复人数</h2><div id="plot-created"></div></section
          ><section
            ><h2>首次回复耗时：当前未记录</h2
            ><div id="plot-first"></div></section
        ></div>
        <section
          ><h2>大家通常什么时候更有空？</h2
          ><p
            >颜色表示被标记为空闲的比例：空闲分钟数 ÷
            可选分钟数。每格均可查看活动数、回复数和分母。灰色代表没有提供该时段，不能当作无人有空。</p
          ><label
            >时间口径
            <select id="time-frame" aria-label="时间口径"
              ><option value="responder_local">回复者所选时区</option
              ><option value="event_local">活动时区</option></select
            ></label
          >
          <label
            >活动模式
            <select id="schedule-filter" aria-label="活动模式"
              ><option value="dates">具体日期</option
              ><option value="weekdays">星期模式</option></select
            ></label
          ><div id="availability-heatmap"></div><p id="heatmap-note"></p
          ><h3>所有回复者共同有空的时段</h3
          ><p
            >按活动时区累计分钟数，颜色越深代表累计共同时间越长。不同活动可能有不同回复人数；单人回复也可形成交集，因此另报多人活动结果。</p
          ><div id="shared-heatmap"></div
        ></section>
        <section
          ><h2>NULL 与未记录字段</h2
          ><p
            >缺失值保留在 CSV 的 NULL 单元格和散点图的 NULL
            区域。没有回复的活动尚不能计算共同时间；星期模式没有可计算的提前日期。</p
          ><div id="missing"></div
        ></section>
        <section
          ><h2>时区分布</h2
          ><p
            >这是填写的时区分布，不是地理位置；活动和回复分别统计，不能当作唯一用户数。</p
          ><h3>活动</h3><div class="bars" id="event-zones"></div><h3>回复</h3
          ><div class="bars" id="response-zones"></div
        ></section>
        <section
          ><h2>共同空闲时段分布</h2
          ><p
            >按星期和小时累计共同空闲分钟数，日期模式和星期模式分开。无数据的桶不表示实际用户一定没空。</p
          ><div class="table"
            ><table
              ><thead
                ><tr
                  ><th>标签</th><th>模式</th><th>星期（1=周一）</th><th>小时</th
                  ><th>总分钟数</th></tr
                ></thead
              ><tbody
                >${(result.shared_time_histogram || [])
                  .map(
                    /* Render each shared-time histogram bucket as a report row. */
                    (h) =>
                      '<tr><td>' +
                      escape(h.topic) +
                      '</td><td>' +
                      escape(h.schedule_mode) +
                      '</td><td>' +
                      h.weekday +
                      '</td><td>' +
                      h.hour +
                      '</td><td>' +
                      h.minutes +
                      '</td></tr>',
                  )
                  .join('')}</tbody
              ></table
            ></div
          ></section
        >
        <section
          ><h2>指标为什么值得分析</h2
          ><dl
            >${methods
              .map(
                /** Render the metric explanation list with escaped text. */
                ([name, reason]) => '<dt>' + escape(name) + '</dt><dd>' + escape(reason) + '</dd>',
              )
              .join('')}</dl
          ><p
            >快照覆盖当前仍存储的所有活动，可能包含试用或重复活动；不自动剔除任何记录，不代表所有历史用户。1.5×IQR
            标记用于人工检查，不认定恶意或无效。</p
          ></section
        >
        <section
          ><h2>逐活动指标（不含姓名）（全部 ${result.events.length} 条）</h2
          ><p
            >编号仅在本次快照内有效，不能用来打开活动。可下载同目录的
            <a href="events.csv">CSV</a> 和 <a href="summary.json">JSON</a>。</p
          ><div class="table"
            ><table
              ><thead
                ><tr
                  >${columns
                    .map(
                      /* Render the event table's column headings. */
                      (c) => '<th>' + escape(c) + '</th>',
                    )
                    .join('')}</tr
                ></thead
              ><tbody
                >${result.events
                  .map(
                    /* Render an event row and mark records that need review. */
                    (e) =>
                      '<tr class="' +
                      (e.review_flags.length ? 'flagged' : '') +
                      '">' +
                      columns
                        .map(
                          /* Render one escaped event field, joining array values for display. */
                          (c) =>
                            '<td>' + escape(Array.isArray(e[c]) ? e[c].join('; ') : e[c]) + '</td>',
                        )
                        .join('') +
                      '</tr>',
                  )
                  .join('')}</tbody
              ></table
            ></div
          ></section
        ></main
      ><div id="tip"></div>
      <script>
        const data = ${JSON.stringify(result).replaceAll('<', '\\u003c')};
        ${ANALYTICS_CHART_SCRIPT};
      </script></html
    >`;
  return html;
}
