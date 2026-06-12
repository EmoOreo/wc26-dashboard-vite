(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))o(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const r of i.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&o(r)}).observe(document,{childList:!0,subtree:!0});function a(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function o(s){if(s.ep)return;s.ep=!0;const i=a(s);fetch(s.href,i)}})();const y="wc26_favorites_v1",n={tab:location.hash.replace("#","")||"overview",data:{matches:[],teams:[],venues:[],meta:{}},query:"",group:"all",matchId:null,team:null,favorites:N()},x=document.querySelector("#app"),E=["overview","schedule","standings","teams"];async function v(t){const e=await fetch(`./data/${t}`);if(!e.ok)throw new Error(`Could not load ${t}`);return e.json()}function N(){try{return JSON.parse(localStorage.getItem(y)||"[]")}catch{return[]}}function O(){localStorage.setItem(y,JSON.stringify(n.favorites))}function m(t){return n.favorites.includes(t)}function q(t){n.favorites=m(t)?n.favorites.filter(e=>e!==t):[...n.favorites,t].sort(),O(),p()}function b(t){return new Intl.DateTimeFormat("en-US",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(t))}function T(t){return new Intl.DateTimeFormat("en-US",{weekday:"short",month:"short",day:"numeric"}).format(new Date(t))}function w(t){return t.status==="finished"?`FT — ${t.home} ${t.homeScore}–${t.awayScore} ${t.away}`:t.status==="live"?`LIVE — ${t.home} ${t.homeScore??0}–${t.awayScore??0} ${t.away}`:`${t.home} vs ${t.away}`}function k(t){return t.status==="finished"?'<span class="badge done">FT</span>':t.status==="live"?'<span class="badge live">LIVE</span>':'<span class="badge upcoming">Scheduled</span>'}function h(t){return n.data.teams.find(e=>e.name===t)||{name:t,flag:"🏳️",group:"?"}}function S(t){const e=h(t),a=g(n.data.matches,n.data.teams)[e.group]||[],o=a.findIndex(s=>s.team===t);return{row:a[o],rank:o+1,rows:a}}function C(t){return n.data.matches.filter(e=>e.home===t||e.away===t).sort((e,a)=>new Date(e.kickoff)-new Date(a.kickoff))}function g(t,e){var s;const a={};for(const i of e)a[s=i.group]??(a[s]={}),a[i.group][i.name]={team:i.name,group:i.group,played:0,won:0,drawn:0,lost:0,gf:0,ga:0,gd:0,points:0};for(const i of t.filter(r=>r.status==="finished")){const r=i.group;if(!a[r])continue;const c=a[r][i.home],d=a[r][i.away];if(!c||!d)continue;const l=Number(i.homeScore),u=Number(i.awayScore);c.played++,d.played++,c.gf+=l,c.ga+=u,d.gf+=u,d.ga+=l,l>u?(c.won++,c.points+=3,d.lost++):l<u?(d.won++,d.points+=3,c.lost++):(c.drawn++,d.drawn++,c.points++,d.points++)}const o={};for(const[i,r]of Object.entries(a))o[i]=Object.values(r).map(c=>({...c,gd:c.gf-c.ga})).sort((c,d)=>d.points-c.points||d.gd-c.gd||d.gf-c.gf||c.team.localeCompare(d.team));return o}function D(t,e={}){n.tab=t,Object.assign(n,e),history.pushState(null,"",`#${t}`),p()}window.addEventListener("popstate",()=>{n.tab=location.hash.replace("#","")||"overview",p()});function L(t){x.innerHTML=`
    <header class="topbar">
      <div>
        <div class="eyebrow">World Cup 2026</div>
        <h1>WC26 Dashboard</h1>
      </div>
      <nav>${E.map(e=>`<button class="pill ${n.tab===e?"active":""}" data-tab="${e}">${A(e)}</button>`).join("")}</nav>
    </header>
    <main class="page">${t}</main>
  `,document.querySelectorAll("[data-tab]").forEach(e=>e.addEventListener("click",()=>D(e.dataset.tab)))}function A(t){return t[0].toUpperCase()+t.slice(1)}function G(){const{matches:t,teams:e,venues:a,meta:o}=n.data,s=t.filter(l=>l.status==="finished").sort((l,u)=>new Date(u.kickoff)-new Date(l.kickoff)),i=t.filter(l=>l.status==="scheduled").sort((l,u)=>new Date(l.kickoff)-new Date(u.kickoff)),r=i[0]||s[0],c=g(t,e),d=F().slice(0,4);return`
    <section class="home-hero card">
      <div>
        <div class="eyebrow">Match Center</div>
        <h2>World Cup dashboard that starts with the games.</h2>
        <p>Track completed results, upcoming fixtures, favorite teams, computed standings, and team pages from one live-feeling hub.</p>
        <div class="hero-actions">
          <button class="primary" data-action="schedule">Open schedule</button>
          <button class="secondary" data-action="standings">View standings</button>
          <button class="secondary" data-action="teams">Manage favorites</button>
        </div>
      </div>
      <article class="spotlight">
        <span class="badge live">Next featured</span>
        <h3>${r?w(r):"No match loaded"}</h3>
        <p>${r?`${b(r.kickoff)} • ${r.venue}`:"Add fixture data to begin."}</p>
        ${r?`<button class="primary small" data-match="${r.id}">Open match</button>`:""}
      </article>
    </section>

    <section class="stat-grid">
      <button class="stat card clickable" data-action="schedule"><strong>${t.length}</strong><span>Fixtures</span></button>
      <button class="stat card clickable" data-action="standings"><strong>${Object.keys(c).length}</strong><span>Groups</span></button>
      <button class="stat card clickable" data-action="teams"><strong>${n.favorites.length}</strong><span>Favorite teams</span></button>
      <article class="stat card"><strong>${a.length}</strong><span>Venues loaded</span></article>
    </section>

    ${n.favorites.length?`
    <section class="card favorite-strip">
      <div class="section-row"><div><h3>My teams</h3><p class="muted">Quick access to your saved teams and their next loaded fixtures.</p></div><button class="secondary small" data-action="teams">Edit favorites</button></div>
      <div class="team-chip-row">${n.favorites.map(l=>I(l)).join("")}</div>
      <div class="match-list compact">${d.map(f).join("")||'<p class="muted">No loaded fixtures for favorites yet.</p>'}</div>
    </section>`:`
    <section class="card empty-favorites">
      <h3>No favorite teams yet</h3>
      <p class="muted">Star teams from the Teams page to create a personal match center.</p>
      <button class="primary small" data-action="teams">Pick favorites</button>
    </section>`}

    <section class="dashboard-grid">
      <article class="card">
        <div class="section-row"><h3>Recently finished</h3><button class="secondary small" data-action="schedule">All fixtures</button></div>
        <div class="match-list">${s.slice(0,4).map(f).join("")||'<p class="muted">No completed matches yet.</p>'}</div>
      </article>
      <article class="card">
        <div class="section-row"><h3>Upcoming</h3><button class="secondary small" data-action="schedule">Schedule</button></div>
        <div class="match-list">${i.slice(0,5).map(f).join("")||'<p class="muted">No upcoming matches loaded.</p>'}</div>
      </article>
      <article class="card wide">
        <div class="section-row"><h3>Group A snapshot</h3><button class="secondary small" data-action="standings">All groups</button></div>
        ${$("A",c.A||[])}
      </article>
      <article class="card">
        <h3>Data status</h3>
        <p class="result-line">Static data loaded successfully</p>
        <p class="muted">Last data update: ${o.lastUpdated?new Date(o.lastUpdated).toLocaleString():"unknown"}</p>
      </article>
    </section>
  `}function F(){return n.favorites.length?n.data.matches.filter(t=>n.favorites.includes(t.home)||n.favorites.includes(t.away)).sort((t,e)=>{const a={live:0,scheduled:1,finished:2};return(a[t.status]??9)-(a[e.status]??9)||new Date(t.kickoff)-new Date(e.kickoff)}):[]}function I(t){const e=h(t),{row:a,rank:o}=S(t);return`<button class="team-chip" data-team="${t}"><strong>${e.flag} ${t}</strong><span>Group ${e.group} • ${o||"-"}${o?j(o):""} • ${(a==null?void 0:a.points)??0} pts</span></button>`}function j(t){return t===1?"st":t===2?"nd":t===3?"rd":"th"}function f(t){const e=h(t.home),a=h(t.away);return`
    <button class="match-card" data-match="${t.id}">
      <div class="match-top"><span>${T(t.kickoff)}</span>${k(t)}</div>
      <div class="teams-line"><span>${e.flag} ${t.home}</span><strong>${t.status==="finished"?`${t.homeScore}–${t.awayScore}`:"vs"}</strong><span>${a.flag} ${t.away}</span></div>
      <div class="muted">Group ${t.group} • ${t.venue}, ${t.city}</div>
    </button>
  `}function P(){const t=n.query.toLowerCase(),e=["all",...new Set(n.data.matches.map(s=>s.group).sort())],a=n.group==="favorites",o=n.data.matches.filter(s=>a?n.favorites.includes(s.home)||n.favorites.includes(s.away):n.group==="all"||s.group===n.group).filter(s=>!t||[s.home,s.away,s.venue,s.city,s.group].join(" ").toLowerCase().includes(t)).sort((s,i)=>new Date(s.kickoff)-new Date(i.kickoff));return`
    <section class="section-head"><div><h2>Schedule</h2><p>Clickable fixture cards with finished, live, scheduled, and favorite-team filtering.</p></div></section>
    <section class="filters card">
      <input id="search" placeholder="Search team, venue, city..." value="${n.query}">
      <select id="groupFilter">
        <option value="all" ${n.group==="all"?"selected":""}>All groups</option>
        <option value="favorites" ${n.group==="favorites"?"selected":""}>My favorites</option>
        ${e.filter(s=>s!=="all").map(s=>`<option value="${s}" ${n.group===s?"selected":""}>Group ${s}</option>`).join("")}
      </select>
    </section>
    <section class="match-grid">${o.map(f).join("")||'<article class="card"><p class="muted">No matches match this filter.</p></article>'}</section>
  `}function M(){const t=g(n.data.matches,n.data.teams);return`
    <section class="section-head"><div><h2>Standings</h2><p>Tables are computed automatically from finished match results. Top two highlighted.</p></div></section>
    <section class="standings-grid">${Object.keys(t).sort().map(e=>`<article class="card"><h3>Group ${e}</h3>${$(e,t[e])}</article>`).join("")}</section>
  `}function $(t,e){return`
    <table class="standings-table">
      <thead><tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
      <tbody>${e.map((a,o)=>`<tr class="${o<2?"qualify":""}"><td><button class="table-team" data-team="${a.team}">${h(a.team).flag} ${a.team}</button></td><td>${a.played}</td><td>${a.won}</td><td>${a.drawn}</td><td>${a.lost}</td><td>${a.gd>0?"+":""}${a.gd}</td><td><strong>${a.points}</strong></td></tr>`).join("")}</tbody>
    </table>
  `}function U(){const t=g(n.data.matches,n.data.teams),e=n.query.toLowerCase(),a=n.data.teams.filter(o=>!e||[o.name,o.group,o.code].join(" ").toLowerCase().includes(e)).sort((o,s)=>Number(m(s.name))-Number(m(o.name))||o.group.localeCompare(s.group)||o.name.localeCompare(s.name));return`
    <section class="section-head"><div><h2>Teams</h2><p>Star teams for your personal dashboard, then click a card for fixtures and group position.</p></div></section>
    <section class="filters card"><input id="search" placeholder="Search teams or groups..." value="${n.query}"></section>
    <section class="team-grid">${a.map(o=>{var r;const s=(r=t[o.group])==null?void 0:r.find(c=>c.team===o.name),i=(t[o.group]||[]).findIndex(c=>c.team===o.name)+1;return`<article class="team-card card ${m(o.name)?"is-favorite":""}">
        <button class="favorite-btn" data-favorite="${o.name}" title="Toggle favorite">${m(o.name)?"★":"☆"}</button>
        <button class="team-main" data-team="${o.name}"><strong>${o.flag} ${o.name}</strong><span>Group ${o.group} • ${i||"-"}${i?j(i):""}</span><span>${(s==null?void 0:s.points)??0} pts • ${(s==null?void 0:s.played)??0} played • GD ${(s==null?void 0:s.gd)>0?"+":""}${(s==null?void 0:s.gd)??0}</span></button>
      </article>`}).join("")}</section>
  `}function B(t){const e=n.data.matches.find(a=>a.id===t);return e?`
    <section class="card detail">
      <button class="secondary small" data-action="schedule">← Back to schedule</button>
      <div class="eyebrow">Group ${e.group} • ${e.stage}</div>
      <h2>${w(e)}</h2>
      <p>${b(e.kickoff)}</p>
      <p>${e.venue}, ${e.city}</p>
      <p>${e.broadcast||"Broadcast TBD"}</p>
      <p>${k(e)}</p>
      <div class="detail-actions">
        <button class="secondary small" data-team="${e.home}">Open ${e.home}</button>
        <button class="secondary small" data-team="${e.away}">Open ${e.away}</button>
      </div>
    </section>
  `:'<section class="card"><h2>Match not found</h2></section>'}function V(t){const e=h(t),a=C(t),{row:o,rank:s,rows:i}=S(t),r=a.find(d=>d.status!=="finished"),c=[...a].reverse().find(d=>d.status==="finished");return`
    <section class="team-detail-grid">
      <article class="card detail team-profile">
        <button class="secondary small" data-action="teams">← Back to teams</button>
        <div class="eyebrow">Group ${e.group}</div>
        <div class="team-title-row"><h2>${e.flag} ${e.name}</h2><button class="favorite-btn large" data-favorite="${e.name}">${m(e.name)?"★ Favorite":"☆ Add favorite"}</button></div>
        <div class="profile-stats">
          <div><strong>${s||"-"}</strong><span>Group rank</span></div>
          <div><strong>${(o==null?void 0:o.points)??0}</strong><span>Points</span></div>
          <div><strong>${(o==null?void 0:o.gd)>0?"+":""}${(o==null?void 0:o.gd)??0}</strong><span>Goal diff</span></div>
          <div><strong>${(o==null?void 0:o.played)??0}</strong><span>Played</span></div>
        </div>
        <div class="split-cards">
          <div><h3>Next match</h3>${r?f(r):'<p class="muted">No upcoming loaded fixture.</p>'}</div>
          <div><h3>Latest result</h3>${c?f(c):'<p class="muted">No completed loaded result.</p>'}</div>
        </div>
      </article>
      <article class="card"><h3>Group ${e.group} table</h3>${$(e.group,i)}</article>
      <article class="card wide"><h3>${e.name} fixtures</h3><div class="match-list">${a.map(f).join("")||'<p class="muted">No fixtures loaded for this team yet.</p>'}</div></article>
    </section>
  `}function W(){document.querySelectorAll("[data-action]").forEach(a=>a.addEventListener("click",()=>D(a.dataset.action))),document.querySelectorAll("[data-match]").forEach(a=>a.addEventListener("click",()=>{n.matchId=a.dataset.match,n.tab="match",p()})),document.querySelectorAll("[data-team]").forEach(a=>a.addEventListener("click",()=>{n.team=a.dataset.team,n.tab="team",p()})),document.querySelectorAll("[data-favorite]").forEach(a=>a.addEventListener("click",o=>{o.stopPropagation(),q(a.dataset.favorite)}));const t=document.querySelector("#search");t&&t.addEventListener("input",a=>{n.query=a.target.value,p()});const e=document.querySelector("#groupFilter");e&&e.addEventListener("change",a=>{n.group=a.target.value,p()})}function p(){let t;n.tab==="schedule"?t=P():n.tab==="standings"?t=M():n.tab==="teams"?t=U():n.tab==="match"?t=B(n.matchId):n.tab==="team"?t=V(n.team):t=G(),L(t),W()}async function J(){try{const[t,e,a,o]=await Promise.all([v("matches.json"),v("teams.json"),v("venues.json"),v("meta.json")]);n.data={matches:t,teams:e,venues:a,meta:o},p()}catch(t){L(`<section class="card"><h2>Dashboard data failed to load</h2><p>${t.message}</p></section>`)}}J();
