(() => {
  'use strict';

  const search = document.getElementById('task-search');
  const familyFilter = document.getElementById('family-filter');
  const rows = document.getElementById('task-rows');
  const table = document.getElementById('catalog-table');
  const count = document.getElementById('catalog-count');
  const empty = document.getElementById('catalog-empty');
  const error = document.getElementById('catalog-error');
  let tasks = [];
  let loading = false;

  const number = task => task.id.slice(-3);
  const anchor = task => `task-${number(task)}`;
  const normalize = value => value.toLocaleLowerCase().normalize('NFKD').replace(/[’']/g, '');
  const familyKey = value => normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function readFilters() {
    const params = new URLSearchParams(location.search);
    const requestedFamily = params.get('family') || 'all';
    const matchingFamily = [...familyFilter.options].find(option =>
      option.value === requestedFamily || familyKey(option.value) === familyKey(requestedFamily));
    familyFilter.value = matchingFamily ? matchingFamily.value : 'all';
    search.value = params.get('q') || '';
  }

  function updateUrl(clearTaskHash = false) {
    const url = new URL(location.href);
    if (familyFilter.value === 'all') url.searchParams.delete('family');
    else url.searchParams.set('family', familyFilter.value);
    if (search.value.trim()) url.searchParams.set('q', search.value.trim());
    else url.searchParams.delete('q');
    if (clearTaskHash && /^#task-\d{3}$/.test(url.hash)) url.hash = 'catalog';
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function render() {
    const query = normalize(search.value.trim());
    const selectedFamily = familyFilter.value;
    const terms = query.split(/\s+/).filter(Boolean);
    const matches = tasks.filter(task => {
      if (selectedFamily !== 'all' && task.family !== selectedFamily) return false;
      const searchable = normalize([
        task.id, `task${number(task)}`, `task-${number(task)}`, number(task),
        task.champion, task.family, task.instruction, `${task.budgetMinutes} min`, ...task.subgoals
      ].join(' '));
      return terms.every(term => searchable.includes(term));
    });

    const fragment = document.createDocumentFragment();
    for (const task of matches) {
      const row = element('tr');
      row.id = anchor(task);
      row.tabIndex = -1;
      const idCell = element('td');
      const link = element('a', `Task${number(task)}`);
      link.href = `#${anchor(task)}`;
      link.dataset.taskLink = number(task);
      link.setAttribute('aria-label', `Task ${number(task)}: ${task.champion}`);
      idCell.append(link);
      row.append(idCell, element('td', task.champion), element('td', task.family), element('td', `${task.budgetMinutes} min`));
      const objective = element('td');
      objective.append(element('p', task.instruction, 'instruction'));
      const details = element('details');
      details.append(element('summary', `${task.subgoals.length} executable subgoal ${task.subgoals.length === 1 ? 'check' : 'checks'}`));
      const checks = element('ul');
      for (const subgoal of task.subgoals) checks.append(element('li', subgoal));
      details.append(checks);
      objective.append(details);
      row.append(objective);
      fragment.append(row);
    }
    rows.replaceChildren(fragment);
    table.hidden = matches.length === 0;
    empty.hidden = matches.length !== 0;
    count.textContent = `${matches.length} of ${tasks.length} tasks${selectedFamily === 'all' ? '' : ` · ${selectedFamily}`}${query ? ` · Search: “${search.value.trim()}”` : ''}`;
  }

  function revealHash(focus = false) {
    const match = location.hash.match(/^#task-(\d{3})$/);
    if (!match || !tasks.length) return;
    const task = tasks.find(item => number(item) === match[1]);
    if (!task) return;
    let target = document.getElementById(anchor(task));
    if (!target) {
      search.value = '';
      familyFilter.value = 'all';
      updateUrl();
      render();
      target = document.getElementById(anchor(task));
    }
    target.querySelector('details').open = true;
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'center', behavior: 'auto' });
      if (focus) target.focus({ preventScroll: true });
    });
  }

  async function loadTasks() {
    if (loading) return;
    loading = true;
    error.hidden = true;
    empty.hidden = true;
    count.textContent = 'Loading 36 tasks…';
    try {
      const response = await fetch('../data/tasks.json?v=20261025');
      if (!response.ok) throw new Error(`Task data returned ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data) || data.length !== 36 || data.some(task =>
        !/^task_\d{3}$/.test(task.id) || typeof task.champion !== 'string' ||
        typeof task.family !== 'string' || !Number.isFinite(task.budgetMinutes) ||
        typeof task.instruction !== 'string' || !Array.isArray(task.subgoals) ||
        task.subgoals.some(subgoal => typeof subgoal !== 'string'))) {
        throw new Error('Task data has an unexpected format');
      }
      tasks = data;
      const families = [...new Set(tasks.map(task => task.family))].sort();
      familyFilter.replaceChildren(new Option('All task families', 'all'), ...families.map(family => new Option(family, family)));
      readFilters();
      search.disabled = false;
      familyFilter.disabled = false;
      render();
      revealHash();
      if (location.hash === '#catalog') requestAnimationFrame(() => document.getElementById('catalog').scrollIntoView());
    } catch (failure) {
      table.hidden = true;
      error.hidden = false;
      count.textContent = 'Task catalog unavailable.';
      console.error('Unable to load LOLPlay tasks:', failure);
    } finally {
      loading = false;
    }
  }

  function changeFilters() {
    updateUrl(true);
    render();
  }

  search.addEventListener('input', changeFilters);
  familyFilter.addEventListener('change', changeFilters);
  document.getElementById('clear-filters').addEventListener('click', () => {
    search.value = '';
    familyFilter.value = 'all';
    changeFilters();
    search.focus();
  });
  document.getElementById('retry-load').addEventListener('click', loadTasks);
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-task-link]');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!tasks.length) return;
    event.preventDefault();
    const hash = `#task-${link.dataset.taskLink}`;
    if (location.hash !== hash) history.pushState(null, '', hash);
    revealHash(true);
  });
  window.addEventListener('hashchange', () => revealHash(true));
  window.addEventListener('popstate', () => {
    if (!tasks.length) return;
    readFilters();
    render();
    revealHash();
  });
  loadTasks();
})();
