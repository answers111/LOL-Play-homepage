(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const color = {'GPT-6 Astra':'#719bd4','GPT-6.1 Sol':'#d98d79','DeepSeek-v4.1-Flash':'#77a88c'};
  const families = [
    {name:'Economy and farming', short:'Economy / farming', count:6, goals:7, color:'#8aafd0', text:'Acquire resources through last hits, level and gold thresholds, and exact inventory requirements.', example:'Syndra: finish with Lost Chapter in the inventory within 7 minutes.'},
    {name:'Development and constraints', short:'Development / constraints', count:9, goals:26, color:'#e8b293', text:'Coordinate ability allocation and attribute growth with joint constraints on the final state.', example:'Ahri: reach 10 CS and level 4, ending with Q2, W1, E1, and R0.'},
    {name:'Sustain and deadline control', short:'Sustain / deadline control', count:7, goals:18, color:'#98b8a0', text:'Preserve health, mana, or survival and satisfy requirements at the specified endpoint.', example:'Brand: have at least 20 CS and 50% mana at the 8-minute deadline.'},
    {name:'Combat', short:'Combat', count:6, goals:13, color:'#d79898', text:'Handle enemy-bot encounters through personal kills or level and survival objectives, with additional resource and time constraints.', example:'Darius: secure a personal kill within 9 minutes with at most one death.'},
    {name:'Cooperation', short:'Cooperation', count:3, goals:8, color:'#b4a4c8', text:'Participate in allied-bot kills through qualifying assists and other task conditions.', example:'Lulu: assist an allied Ashe in a qualifying kill within 10 minutes, with at most one death.'},
    {name:'Map objectives', short:'Map objectives', count:5, goals:10, color:'#d2c091', text:'Complete neutral-monster and structure objectives, including required event order.', example:'Warwick: personally kill a Voidgrub, then destroy the enemy top outer turret.'}
  ];
  const findings = [
    {label:'Reasoning Effort and Task Completion', image:'effort.svg', title:'High Effort Does Not Improve Success over Low Effort', intro:'Low effort achieves or ties the highest task success rate for each evaluated model.', points:['GPT-6 Astra completes 9, 9, and 6 of 36 tasks at low, medium, and high effort.','Sol completes 5, 4, and 4 tasks; DeepSeek-v4.1-Flash completes 2, 1, and 0.','Astra low and medium tie at 25.0% task success. Medium achieves the highest subgoal success, 40.3%, compared with 37.7% at low effort.']},
    {label:'Partial Progress and Full Completion', image:'capabilities.svg', title:'Partial Progress Rarely Becomes Full Success', intro:'Agents can satisfy individual conditions yet fail to compose them into a complete task.', points:['Development tasks average 55.5% subgoal success and 23.5% task success.','Sustain tasks average 27.0% subgoal success, with no successful episode.','Three task families have zero full success across all evaluated models: sustain, cooperation, and map objectives.']},
    {label:'Latency and Execution Budgets', image:'temporal.svg', title:'Timely Control Requires More Than Speed', intro:'Request latency and decision budgets contextualize performance in a continuously running environment.', points:["Astra's mean latency rises from 7.47 to 16.67 seconds from low to high effort, while task success falls by one-third, from 25.0% to 16.7%.",'Of 55 capped DeepSeek low/medium runs, 32 achieve no subgoal; only 5 of 93 positive-attainment checks pass.','These descriptive comparisons do not isolate latency as a causal intervention.']}
  ];
  let results = [], tasks = [], xMetric = 'latency', yMetric = 'taskSuccess';
  let visibleModels = new Set(Object.keys(color));
  let provider = 'all', effort = 'all', sortKey = 'taskSuccess', sortDirection = -1, finding = 0;

  function showFinding(index) {
    finding = (index + findings.length) % findings.length;
    const f = findings[finding];
    $('#finding-label').textContent = f.label;
    $('#finding-content').innerHTML = `<button class="image-button" data-zoom="assets/${f.image}?v=20261025" data-caption="${esc(f.title)}" aria-label="Enlarge ${esc(f.title)}"><img src="assets/${f.image}?v=20261025" alt="${esc(f.title)}" loading="lazy"></button><div><h3>${f.title}</h3><p>${f.intro}</p><ul>${f.points.map(p=>`<li>${p}</li>`).join('')}</ul></div>`;
    $('#finding-dots').innerHTML = findings.map((f,i)=>`<button class="${i===finding?'active':''}" aria-label="Show finding ${i+1}: ${esc(f.label)}" aria-pressed="${i===finding}" data-finding="${i}"></button>`).join('')+`<span>${finding+1} / ${findings.length}</span>`;
  }
  function showCase(index) {
    $$('[data-case]').forEach(b=>b.setAttribute('aria-selected',String(Number(b.dataset.case)===index)));
    const failed = index === 0;
    const title = failed ? 'A Decision Arrives After the Scene Has Changed' : "From Task Instruction to Verified Completion";
    const image = failed ? 'action_time_evolution.png' : 'success_walkthrough.png';
    $('#case-content').innerHTML = `<span class="eyebrow">${failed?'Task035 · Warwick · GPT-6 Astra (medium)':"Task013 · Cho'Gath · GPT-6 Astra (medium)"}</span><h3>${title}</h3><button class="image-button" data-zoom="assets/${image}" data-caption="${esc(title)}" aria-label="Enlarge case study"><img src="assets/${image}" alt="${failed?'Two archived observations show Warwick in combat and then at the fountain behind an AFK dialog, with the same click coordinate marked.':"Six selected decision inputs from a successful Cho'Gath episode showing equipment purchase, combat, recovery, ultimate allocation, and completion."}" loading="lazy"></button><div class="case-detail-grid">${failed ? '<div><h4>Task setup</h4><p>Personally kill a Voidgrub, then destroy the enemy top outer turret within 12 minutes.</p><h4>Observation delay</h4><p>The input frame at 09:16 shows combat. During a 144.641-second request, the archive records a Voidgrub kill and a death. The next frame at 11:42 shows the fountain and an inactivity warning.</p></div><div><h4>Outcome</h4><p>Only one of three checks passes. The Voidgrub kill is verified, but the turret and ordered sequence remain incomplete.</p><p>The same logged click coordinate falls in a changed visual context. The archive does not establish which individual inputs were intercepted or that latency alone caused failure.</p></div>' : '<div><h4>Task setup</h4><p>Reach level 6, learn R, and increase maximum health by at least 350 within a 9-minute budget.</p><h4>Execution</h4><p>The selected observations span shopping, lane combat, recovery, and ultimate allocation. The full episode includes 33 responses and two deaths.</p></div><div><h4>Verified completion</h4><p>All three checks pass: level 6, R rank 1, and maximum-health growth of 795.3. Execution takes 420.8 seconds against a 540-second budget.</p><p>Success verifies the final task contract. It does not establish optimal play or attribute all health growth to one ability.</p></div>'}</div>`;
  }
  function showFamily(index) {
    const f=families[index];
    $$('#family-list button').forEach((b,i)=>{b.classList.toggle('active',i===index);b.setAttribute('aria-pressed',String(i===index));});
    $('#family-detail').innerHTML=`<strong>${f.short} · ${f.count} tasks · ${f.goals} subgoal checks</strong><p>${f.text} ${f.example}</p><a href="task-showcase/?family=${encodeURIComponent(f.name)}#catalog">Explore this task family ↗</a>`;
  }
  function drawFamilies() {
    const radius=112,cx=165,cy=165;
    let start=-Math.PI/2;
    const arcs=families.map((f,i)=>{
      const end=start+f.count/36*Math.PI*2;
      const x1=cx+radius*Math.cos(start),y1=cy+radius*Math.sin(start),x2=cx+radius*Math.cos(end),y2=cy+radius*Math.sin(end);
      const path=`M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${end-start>Math.PI?1:0} 1 ${x2},${y2} Z`;
      start=end;
      return `<path d="${path}" fill="${f.color}" data-family="${i}" tabindex="0" role="button" aria-label="${f.short}: ${f.count} tasks and ${f.goals} subgoal checks"><title>${f.short}: ${f.count} tasks (${(f.count/36*100).toFixed(1)}%)</title></path>`;
    }).join('');
    $('#family-donut').innerHTML=`<svg viewBox="0 0 330 330" role="img" aria-label="36 tasks across six families">${arcs}<circle cx="165" cy="165" r="73" fill="white"/><text x="165" y="161" text-anchor="middle" font-family="Palatino Linotype,Georgia,serif" font-size="42" fill="#363636">36</text><text x="165" y="188" text-anchor="middle" font-family="Palatino Linotype,Georgia,serif" font-size="15" fill="#888">tasks · 6 families</text></svg>`;
    $('#family-list').innerHTML=families.map((f,i)=>`<button data-family="${i}" aria-pressed="${i===0}"><i style="background:${f.color}"></i><span>${f.short}</span><b>${f.count} tasks</b></button>`).join('');
    showFamily(0);
  }
  function drawSweep() {
    const rows=results.filter(r=>visibleModels.has(r.model));
    const width=580,height=360,left=62,right=22,top=25,bottom=55;
    const maxX=xMetric==='latency'?20:100;
    const maxY=Math.max(5,Math.ceil((Math.max(0,...results.map(r=>r[yMetric]))+2)/5)*5);
    const px=v=>left+v/maxX*(width-left-right),py=v=>height-bottom-v/maxY*(height-top-bottom);
    const xLabel=xMetric==='latency'?'Mean completed-request latency (s)':'Mean responses per executed episode';
    const yLabel=yMetric==='taskSuccess'?'Task success (%)':'Subgoal success (%)';
    let svg=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${yLabel} versus ${xLabel}"><rect x="${left}" y="${top}" width="${width-left-right}" height="${height-top-bottom}" fill="#fff"/>`;
    for(let i=0;i<=5;i++){const v=maxX*i/5,x=px(v);svg+=`<line x1="${x}" y1="${top}" x2="${x}" y2="${height-bottom}" stroke="#ededed"/><text x="${x}" y="${height-bottom+20}" text-anchor="middle" font-size="12" fill="#777">${v}</text>`;}
    for(let v=0;v<=maxY;v+=5){const y=py(v);svg+=`<line x1="${left}" y1="${y}" x2="${width-right}" y2="${y}" stroke="#e7e7e7"/><text x="${left-12}" y="${y+4}" text-anchor="end" font-size="12" fill="#777">${v}</text>`;}
    Object.keys(color).forEach(model=>{
      const mr=rows.filter(r=>r.model===model);
      if(mr.length)svg+=`<polyline points="${mr.map(r=>`${px(r[xMetric])},${py(r[yMetric])}`).join(' ')}" fill="none" stroke="${color[model]}" stroke-width="2" opacity=".85"/>`;
      mr.forEach(r=>{const index=results.indexOf(r),rad={low:5,medium:6.5,high:8}[r.effort];svg+=`<circle class="chart-point" data-point="${index}" cx="${px(r[xMetric])}" cy="${py(r[yMetric])}" r="${rad}" fill="${color[model]}" stroke="white" stroke-width="1.5" tabindex="0" role="button" aria-label="${esc(r.model)} ${r.effort}: ${r[yMetric]} percent, ${r[xMetric]} ${xMetric==='latency'?'seconds':'turns'}"><title>${r.model} (${r.effort}): ${r[yMetric]}%, ${r[xMetric]} ${xMetric==='latency'?'s':'turns'}</title></circle>`;});
    });
    svg+=`<line x1="${left}" y1="${height-bottom}" x2="${width-right}" y2="${height-bottom}" stroke="#999"/><line x1="${left}" y1="${top}" x2="${left}" y2="${height-bottom}" stroke="#999"/><text x="${(width+left-right)/2}" y="${height-9}" text-anchor="middle" font-size="14" fill="#555">${xLabel}</text><text transform="translate(17,${(height+top-bottom)/2}) rotate(-90)" text-anchor="middle" font-size="14" fill="#555">${yLabel}</text></svg>`;
    $('#sweep-chart').innerHTML=svg;
    $('#sweep-chart').setAttribute('aria-label',`${yLabel} versus ${xLabel}`);
    $('#sweep-x-header').textContent=xMetric==='latency'?'Latency':'Turns';
    $('#sweep-y-header').textContent=yMetric==='taskSuccess'?'Task success':'Subgoal';
    $('#sweep-rows').innerHTML=[...rows].sort((a,b)=>b[yMetric]-a[yMetric]).map(r=>`<tr><td><i class="dot" style="background:${color[r.model]}"></i>${r.model}</td><td>${r.effort}</td><td>${r[xMetric].toFixed(xMetric==='latency'?2:1)}${xMetric==='latency'?' s':''}</td><td><strong>${r[yMetric].toFixed(1)}%</strong></td></tr>`).join('') || '<tr><td colspan="4">Select a model to show its results.</td></tr>';
    $('#chart-tooltip').hidden=true;
  }
  function drawLeaderboard() {
    const bestTask=Math.max(...results.map(r=>r.taskSuccess)),bestSubgoal=Math.max(...results.map(r=>r.subgoalSuccess));
    const rows=results.filter(r=>(provider==='all'||r.provider===provider)&&(effort==='all'||r.effort===effort)).sort((a,b)=>sortDirection*(a[sortKey]-b[sortKey])||b.taskSuccess-a.taskSuccess||a.latency-b.latency);
    $('#leaderboard-rows').innerHTML=rows.map((r,i)=>`<tr><td>${i+1}</td><td><span class="model-name">${r.model}</span><span class="provider">${r.provider}</span></td><td><span class="tag effort">${r.effort}</span><span class="tag">Screenshot</span><span class="tag">Mouse &amp; keyboard</span></td><td class="score ${r.taskSuccess===bestTask?'top-score':''}">${r.taskSuccess.toFixed(1)}%</td><td class="score ${r.subgoalSuccess===bestSubgoal?'top-score':''}">${r.subgoalSuccess.toFixed(1)}%</td><td>${r.latency.toFixed(2)} s</td><td>${r.turns.toFixed(1)}</td></tr>`).join('');
    $$('[data-sort]').forEach(b=>{const active=b.dataset.sort===sortKey;b.innerHTML=`${{taskSuccess:'Task success',subgoalSuccess:'Subgoal',latency:'Latency / request'}[b.dataset.sort]}${active?(sortDirection===-1?' ↓':' ↑'):''}`;b.parentElement.setAttribute('aria-sort',active?(sortDirection===-1?'descending':'ascending'):'none');});
  }
  function drawShowcase(){
    const ids=['036','009','016','022','025','035'];
    $('#showcase-rail').innerHTML=ids.map(id=>{
      const t=tasks.find(t=>t.id===`task_${id}`);
      if(!t)return '';
      return `<a class="showcase-card" href="task-showcase/#task-${id}"><img src="assets/examples/${id}.png" alt="Archived screenshot for task ${id}, ${esc(t.champion)}" loading="lazy" width="1920" height="1080"><div><small>TASK ${id} · ${esc(t.family)}</small><h3>${esc(t.champion)}</h3><p>${t.budgetMinutes} minutes · ${t.subgoals.length} subgoal ${t.subgoals.length===1?'check':'checks'}</p></div></a>`;
    }).join('');
  }
  function drawBudgets(){
    const counts=new Map();tasks.forEach(t=>counts.set(t.budgetMinutes,(counts.get(t.budgetMinutes)||0)+1));
    const entries=[...counts].sort((a,b)=>a[0]-b[0]),width=500,height=290,left=45,bottom=40,top=25,plot=width-left-15,max=Math.max(...entries.map(e=>e[1]));
    let svg=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Task counts by nominal execution budget in minutes">`;
    for(let i=0;i<=max;i+=2){const y=height-bottom-i/max*(height-top-bottom);svg+=`<line x1="${left}" x2="${width-15}" y1="${y}" y2="${y}" stroke="#e8e8e8"/><text x="${left-10}" y="${y+4}" text-anchor="end" font-size="12" fill="#888">${i}</text>`;}
    entries.forEach(([minute,count],i)=>{const col=plot/entries.length,x=left+i*col+col*.16,h=count/max*(height-top-bottom),y=height-bottom-h;svg+=`<rect x="${x}" y="${y}" width="${col*.68}" height="${h}" rx="2" fill="#8aafd0"><title>${minute} minutes: ${count} tasks</title></rect><text x="${x+col*.34}" y="${y-7}" text-anchor="middle" font-size="13" fill="#666">${count}</text><text x="${x+col*.34}" y="${height-bottom+20}" text-anchor="middle" font-size="12" fill="#777">${minute}</text>`;});
    svg+=`<text x="${width/2}" y="${height-2}" text-anchor="middle" font-size="13" fill="#666">Nominal task budget (minutes)</text><text transform="translate(13,${height/2}) rotate(-90)" text-anchor="middle" font-size="13" fill="#666">Number of tasks</text></svg>`;
    $('#budget-chart').innerHTML=svg;
  }

  document.addEventListener('click',(event)=>{
    const zoom=event.target.closest('[data-zoom]');
    if(zoom){const dialog=$('#image-dialog');$('#dialog-image').src=zoom.dataset.zoom;$('#dialog-image').alt=zoom.dataset.caption||'';$('#dialog-caption').textContent=zoom.dataset.caption||'';dialog.showModal();return;}
    const family=event.target.closest('[data-family]');if(family){showFamily(Number(family.dataset.family));return;}
    const find=event.target.closest('[data-finding]');if(find){showFinding(Number(find.dataset.finding));return;}
    const cs=event.target.closest('[data-case]');if(cs){showCase(Number(cs.dataset.case));return;}
    const x=event.target.closest('[data-x]');if(x){xMetric=x.dataset.x;$$('[data-x]').forEach(b=>{b.classList.toggle('active',b===x);b.setAttribute('aria-pressed',String(b===x));});drawSweep();return;}
    const y=event.target.closest('[data-y]');if(y){yMetric=y.dataset.y;$$('[data-y]').forEach(b=>{b.classList.toggle('active',b===y);b.setAttribute('aria-pressed',String(b===y));});drawSweep();return;}
    const p=event.target.closest('[data-provider]');if(p){provider=p.dataset.provider;$$('[data-provider]').forEach(b=>{b.classList.toggle('active',b===p);b.setAttribute('aria-pressed',String(b===p));});drawLeaderboard();return;}
    const sort=event.target.closest('[data-sort]');if(sort){sortDirection=sortKey===sort.dataset.sort?-sortDirection:(sort.dataset.sort==='latency'?1:-1);sortKey=sort.dataset.sort;drawLeaderboard();}
  });
  document.addEventListener('keydown',event=>{const family=event.target.closest('#family-donut [data-family]');if(family&&(event.key==='Enter'||event.key===' ')){event.preventDefault();showFamily(Number(family.dataset.family));}});
  $('#finding-prev').addEventListener('click',()=>showFinding(finding-1));
  $('#finding-next').addEventListener('click',()=>showFinding(finding+1));
  $('#effort-filter').addEventListener('change',e=>{effort=e.target.value;drawLeaderboard();});
  $$('.model-toggles input').forEach(input=>input.addEventListener('change',()=>{input.checked?visibleModels.add(input.value):visibleModels.delete(input.value);drawSweep();}));
  const tooltip=(event)=>{const point=event.target.closest('[data-point]');if(!point)return;const r=results[Number(point.dataset.point)];if(!r)return;const t=$('#chart-tooltip');t.innerHTML=`<strong>${r.model} · ${r.effort}</strong><br>${r.taskSuccess.toFixed(1)}% task · ${r.subgoalSuccess.toFixed(1)}% subgoal<br>${r.latency.toFixed(2)} s / request · ${r.turns.toFixed(1)} turns`;t.hidden=false;};
  $('#sweep-chart').addEventListener('pointerover',tooltip);$('#sweep-chart').addEventListener('focusin',tooltip);
  $('#sweep-chart').addEventListener('pointerleave',()=>{$('#chart-tooltip').hidden=true;});$('#sweep-chart').addEventListener('focusout',()=>{$('#chart-tooltip').hidden=true;});
  $('#image-dialog .dialog-close').addEventListener('click',()=>$('#image-dialog').close());
  $('#image-dialog').addEventListener('click',event=>{if(event.target===$('#image-dialog'))$('#image-dialog').close();});
  $('#copy-citation').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText($('#citation-text').textContent);$('#copy-citation').textContent='Copied!';$('#copy-status').textContent='Citation copied to clipboard.';}
    catch{const selection=window.getSelection(),range=document.createRange();range.selectNodeContents($('#citation-text'));selection.removeAllRanges();selection.addRange(range);$('#copy-citation').textContent='Selected';$('#copy-status').textContent='Citation selected. Press Control C or Command C to copy.';}
  });
  drawFamilies();showFinding(0);showCase(0);
  Promise.all(['results','tasks'].map(name=>fetch(`data/${name}.json?v=20261025`).then(r=>{if(!r.ok)throw new Error(`Cannot load ${name}`);return r.json();})))
    .then(([r,t])=>{results=r;tasks=t;drawSweep();drawLeaderboard();drawShowcase();drawBudgets();})
    .catch(()=>{['#sweep-rows','#leaderboard-rows'].forEach(id=>$(id).innerHTML='<tr><td colspan="7">Results could not load. Please refresh or download the paper.</td></tr>');});
})();
