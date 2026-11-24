/** Browser drawing code embedded in the standalone analysis report. */
export const ANALYTICS_CHART_SCRIPT = String.raw`
const labels = {
  response_count: '回复人数',
  shared_minutes: '共同空闲分钟数',
  lead_days: '提前安排天数',
  creation_hour_local: '活动时区的创建小时',
  first_response_hours: '首次回复小时数',
};
const topicNames = {
  all: '全部活动',
  'college-student-related': '大学生／校园相关活动',
  meeting: '会议',
  study: '学习',
  social: '社交聚餐',
  sports: '运动',
  career: '求职',
  unclassified: '未分类',
};
const topicSelect = document.getElementById('topic-filter');
Object.keys(data.summary.topic_counts).forEach((key) => {
  let option = document.createElement('option');
  option.value = key;
  option.textContent = (topicNames[key] || key) + '（' + data.summary.topic_counts[key] + '）';
  topicSelect.append(option);
});
/** Return events matching the selected topic; all preserves the complete dataset. */
function filteredEvents() {
  let topic = topicSelect.value;
  return topic === 'all'
    ? data.events
    : data.events.filter((event) => event.topic_tags.includes(topic));
}
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
/** Create an SVG element with attributes and optional text. */
function svgElement(tag, attributes, text) {
  let element = document.createElementNS(SVG_NAMESPACE, tag);
  Object.entries(attributes || {}).forEach(([key, value]) => element.setAttribute(key, value));
  if (text !== undefined) element.textContent = text;
  return element;
}
/** Add one event's marker, including NULL markers and its hover details. */
function appendScatterPoint(svg, record, i, { xKey, yKey, xPosition, yPosition, nullX, nullY }) {
  let missingX = record[xKey] === null || record[xKey] === undefined,
    missingY = record[yKey] === null || record[yKey] === undefined,
    x = (missingX ? nullX : xPosition(record[xKey])) + ((i % 5) - 2) * 1.5,
    y = (missingY ? nullY : yPosition(record[yKey])) + ((Math.floor(i / 5) % 5) - 2) * 1.5,
    element =
      missingX || missingY
        ? svgElement('path', { d: 'M' + (x - 3) + ',' + (y - 3) + 'l6,6m0,-6l-6,6', class: 'null' })
        : svgElement('circle', {
            cx: x,
            cy: y,
            r: 4,
            class: record.review_flags.length ? 'flag' : '',
          });
  let text =
    record.event_code +
    ' · ' +
    (record.event_title || '') +
    ' · ' +
    labels[xKey] +
    ': ' +
    (missingX ? 'NULL' : record[xKey]) +
    ' · ' +
    labels[yKey] +
    ': ' +
    (missingY ? 'NULL' : record[yKey]) +
    ' · ' +
    record.schedule_mode +
    (record.review_flags.length ? ' · ' + record.review_flags.join('; ') : '');
  element.append(svgElement('title', {}, text));
  element.addEventListener('pointermove', (event) => {
    let t = document.getElementById('tip');
    t.textContent = text;
    t.style.display = 'block';
    t.style.left = Math.min(innerWidth - 290, Math.max(10, event.clientX + 12)) + 'px';
    t.style.top = Math.min(innerHeight - 110, Math.max(10, event.clientY + 12)) + 'px';
  });
  element.addEventListener(
    'pointerleave',
    () => (document.getElementById('tip').style.display = 'none'),
  );
  svg.append(element);
}

/** Draw one scatter plot, keeping unknown values on the NULL lanes. */
function chart(id, xKey, yKey) {
  let rows = filteredEvents(),
    width = 520,
    height = 350,
    left = 74,
    right = 20,
    top = 24,
    bottom = 78,
    svg = svgElement('svg', {
      viewBox: '0 0 ' + width + ' ' + height,
      role: 'img',
      'aria-label': labels[xKey] + ' 与 ' + labels[yKey] + '，保留全部 ' + rows.length + ' 条记录',
    });
  const numbers = (key) =>
    rows
      .map((record) => record[key])
      .filter((value) => typeof value === 'number' && Number.isFinite(value));
  const bounds = (key) => {
    let value = numbers(key),
      min = value.length ? Math.min(0, ...value) : 0,
      max = value.length ? Math.max(...value) : 1;
    if (max === min) max = min + 1;
    return [min, max];
  };
  let [xMinimum, xMaximum] = bounds(xKey),
    [yMinimum, yMaximum] = bounds(yKey);
  let xPosition = (value) =>
      left + 32 + ((value - xMinimum) / (xMaximum - xMinimum)) * (width - left - right - 32),
    yPosition = (value) =>
      height -
      bottom -
      22 -
      ((value - yMinimum) / (yMaximum - yMinimum)) * (height - top - bottom - 22);
  let nullX = left - 28,
    nullY = height - bottom + 26;
  svg.append(
    svgElement('rect', {
      x: left,
      y: top,
      width: width - left - right,
      height: height - top - bottom,
      fill: '#fbfcf8',
      stroke: '#ccd8c6',
    }),
  );
  for (let i = 0; i <= 4; i++) {
    let xTick = xMinimum + ((xMaximum - xMinimum) * i) / 4,
      yTick = yMinimum + ((yMaximum - yMinimum) * i) / 4;
    svg.append(
      svgElement(
        'text',
        {
          x: xPosition(xTick),
          y: height - bottom + 16,
          'text-anchor': 'middle',
          'font-size': 10,
          fill: '#65746a',
        },
        Number(xTick.toFixed(1)),
      ),
    );
    svg.append(
      svgElement(
        'text',
        {
          x: left - 5,
          y: yPosition(yTick) + 4,
          'text-anchor': 'end',
          'font-size': 10,
          fill: '#65746a',
        },
        Number(yTick.toFixed(1)),
      ),
    );
  }
  svg.append(
    svgElement(
      'text',
      {
        x: nullX,
        y: height - bottom + 17,
        'text-anchor': 'middle',
        'font-size': 10,
        fill: '#697681',
      },
      'NULL',
    ),
  );
  svg.append(
    svgElement(
      'text',
      { x: left - 5, y: nullY + 4, 'text-anchor': 'end', 'font-size': 10, fill: '#697681' },
      'NULL',
    ),
  );
  svg.append(
    svgElement(
      'text',
      { x: width / 2, y: height - 8, 'text-anchor': 'middle', 'font-size': 12, fill: '#294f43' },
      labels[xKey],
    ),
  );
  svg.append(
    svgElement(
      'text',
      {
        x: 14,
        y: height / 2,
        transform: 'rotate(-90 14 ' + height / 2 + ')',
        'text-anchor': 'middle',
        'font-size': 12,
        fill: '#294f43',
      },
      labels[yKey],
    ),
  );
  rows.forEach((record, i) =>
    appendScatterPoint(svg, record, i, { xKey, yKey, xPosition, yPosition, nullX, nullY }),
  );

  document.getElementById(id).replaceChildren(svg);
  let p = document.createElement('p');
  p.textContent =
    '当前标签 ' +
    rows.length +
    ' 条；横轴 NULL ' +
    rows.filter((record) => record[xKey] == null).length +
    ' 条；纵轴 NULL ' +
    rows.filter((record) => record[yKey] == null).length +
    ' 条。';
  document.getElementById(id).append(p);
}
/** Draw the selected availability histogram and refresh the shared-time map. */
function heatmap() {
  let mode = document.getElementById('schedule-filter').value,
    frame = document.getElementById('time-frame').value,
    topic = topicSelect.value,
    rows = (data.availability_histogram || []).filter(
      (height) =>
        height.topic === topic && height.schedule_mode === mode && height.time_frame === frame,
    ),
    svg = svgElement('svg', {
      viewBox: '0 0 960 280',
      role: 'img',
      'aria-label': '星期与小时空闲比例热力图',
    }),
    days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  for (let height = 0; height < 24; height++)
    svg.append(
      svgElement(
        'text',
        { x: 68 + height * 36, y: 25, 'text-anchor': 'middle', 'font-size': 12, fill: '#53665a' },
        height,
      ),
    );
  for (let weekday = 1; weekday <= 7; weekday++) {
    svg.append(
      svgElement(
        'text',
        {
          x: 45,
          y: 48 + (weekday - 1) * 29,
          'text-anchor': 'end',
          'font-size': 12,
          fill: '#53665a',
        },
        days[weekday - 1],
      ),
    );
    for (let height = 0; height < 24; height++) {
      let row = rows.find((record) => record.weekday === weekday && record.hour === height),
        rate = row && row.offered_minutes > 0 ? row.available_minutes / row.offered_minutes : null,
        rect = svgElement('rect', {
          x: 52 + height * 36,
          y: 32 + (weekday - 1) * 29,
          width: 33,
          height: 25,
          rx: 3,
          fill: rate === null ? '#e4e8e1' : 'hsl(157 38% ' + (94 - rate * 64) + '%)',
        });
      let text =
        days[weekday - 1] +
        ' ' +
        height +
        ':00 · ' +
        (rate === null
          ? 'NULL：没有可选时段'
          : (100 * rate).toFixed(1) +
            '% · 空闲 ' +
            row.available_minutes +
            ' / 可选 ' +
            row.offered_minutes +
            ' 分钟 · ' +
            row.events +
            ' 活动，' +
            row.responses +
            ' 条回复');
      rect.append(svgElement('title', {}, text));
      rect.addEventListener('pointermove', (event) => {
        let tip = document.getElementById('tip');
        tip.textContent = text;
        tip.style.display = 'block';
        tip.style.left = Math.min(innerWidth - 290, Math.max(10, event.clientX + 12)) + 'px';
        tip.style.top = Math.min(innerHeight - 110, event.clientY + 12) + 'px';
      });
      rect.addEventListener(
        'pointerleave',
        () => (document.getElementById('tip').style.display = 'none'),
      );
      svg.append(rect);
    }
  }
  document.getElementById('availability-heatmap').replaceChildren(svg);
  sharedHeatmap(mode, topic);
  document.getElementById('heatmap-note').textContent =
    '当前：' +
    (topicNames[topic] || topic) +
    ' · ' +
    rows.length +
    ' 个有数据的星期／小时桶。比例仅代表用户在活动提供的选项中标记的空闲，不代表全天真实空闲。';
}
/** Draw shared minutes by weekday/hour; grey means no offered sample. */
function sharedHeatmap(mode, topic) {
  let rows = (data.shared_time_histogram || []).filter(
      (height) => height.topic === topic && height.schedule_mode === mode,
    ),
    offered = (data.availability_histogram || []).filter(
      (height) =>
        height.topic === topic &&
        height.schedule_mode === mode &&
        height.time_frame === 'event_local',
    ),
    max = Math.max(1, ...rows.map((record) => record.minutes)),
    svg = svgElement('svg', {
      viewBox: '0 0 960 270',
      role: 'img',
      'aria-label': '按活动主题查看全员共同空闲时段',
    }),
    days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  for (let height = 0; height < 24; height++)
    svg.append(
      svgElement(
        'text',
        { x: 68 + height * 36, y: 25, 'text-anchor': 'middle', 'font-size': 12, fill: '#53665a' },
        height,
      ),
    );
  for (let weekday = 1; weekday <= 7; weekday++) {
    svg.append(
      svgElement(
        'text',
        {
          x: 45,
          y: 48 + (weekday - 1) * 29,
          'text-anchor': 'end',
          'font-size': 12,
          fill: '#53665a',
        },
        days[weekday - 1],
      ),
    );
    for (let height = 0; height < 24; height++) {
      let row = rows.find((record) => record.weekday === weekday && record.hour === height),
        known = offered.some((record) => record.weekday === weekday && record.hour === height),
        minutes = row?.minutes || 0,
        rect = svgElement('rect', {
          x: 52 + height * 36,
          y: 32 + (weekday - 1) * 29,
          width: 33,
          height: 25,
          rx: 3,
          fill: known ? 'hsl(157 38% ' + (94 - (64 * minutes) / max) + '%)' : '#e4e8e1',
        });
      rect.append(
        svgElement(
          'title',
          {},
          days[weekday - 1] +
            ' ' +
            height +
            ':00 · ' +
            (known
              ? minutes + ' 分钟共同空闲 · ' + (row?.events || 0) + ' 个活动'
              : 'NULL：没有可计算样本'),
        ),
      );
      svg.append(rect);
    }
  }
  document.getElementById('shared-heatmap').replaceChildren(svg);
}
/** Refresh all plots after the topic filter changes. */
function update() {
  chart('plot-common', 'response_count', 'shared_minutes');
  chart('plot-lead', 'lead_days', 'response_count');
  chart('plot-created', 'creation_hour_local', 'response_count');
  chart('plot-first', 'response_count', 'first_response_hours');
  heatmap();
  document.getElementById('topic-counts').textContent =
    '当前标签 ' +
    filteredEvents().length +
    ' 个活动；全部 ' +
    data.events.length +
    ' 个活动仍保存在数据表中。';
}
topicSelect.addEventListener('change', update);
document.getElementById('time-frame').addEventListener('change', heatmap);
document.getElementById('schedule-filter').addEventListener('change', heatmap);
update();
/** Draw counts as horizontal bars in the supplied report section. */
function bars(id, rows) {
  let box = document.getElementById(id),
    max = Math.max(1, ...rows.map((record) => record.count));
  rows.forEach((record) => {
    let weekday = document.createElement('div');
    weekday.className = 'bar';
    let label = document.createElement('span');
    label.textContent = record.timezone || record.field;
    let track = document.createElement('div'),
      bar = document.createElement('i');
    bar.style.width = (100 * record.count) / max + '%';
    track.append(bar);
    let element = document.createElement('span');
    element.textContent = record.count;
    weekday.append(label, track, element);
    box.append(weekday);
  });
}
bars(
  'missing',
  Object.entries(data.summary.missing).map(([field, count]) => ({ field, count })),
);
bars('event-zones', data.event_timezones || []);
bars('response-zones', data.response_timezones || []);
`;
