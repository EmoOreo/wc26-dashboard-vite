(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))o(s);new MutationObserver(s=>{for(const a of s)if(a.type==="childList")for(const i of a.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&o(i)}).observe(document,{childList:!0,subtree:!0});function n(s){const a={};return s.integrity&&(a.integrity=s.integrity),s.referrerPolicy&&(a.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?a.credentials="include":s.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function o(s){if(s.ep)return;s.ep=!0;const a=n(s);fetch(s.href,a)}})();async function b(){const[t,e,n,o]=await Promise.all([u("./data/matches.json"),u("./data/teams.json"),u("./data/venues.json"),u("./data/meta.json")]);return{matches:t,teams:e,venues:n,meta:o}}async function u(t){const e=await fetch(t,{cache:"no-cache"});if(!e.ok)throw new Error(`Failed to load ${t}`);return e.json()}function w(t,e){var o,s;const n=S(e);for(const a of t.filter(i=>i.status==="finished")){const i=(o=n[a.group])==null?void 0:o.find(f=>f.team===a.home),d=(s=n[a.group])==null?void 0:s.find(f=>f.team===a.away);!i||!d||(v(i,a.homeScore,a.awayScore),v(d,a.awayScore,a.homeScore))}for(const a of Object.keys(n))n[a].sort((i,d)=>d.points-i.points||d.gd-i.gd||d.gf-i.gf||i.team.localeCompare(d.team));return n}function S(t){return t.reduce((e,n)=>{var o;return e[o=n.group]??(e[o]=[]),e[n.group].push({team:n.name,code:n.code,group:n.group,played:0,won:0,drawn:0,lost:0,gf:0,ga:0,gd:0,points:0}),e},{})}function v(t,e,n){t.played+=1,t.gf+=e,t.ga+=n,t.gd=t.gf-t.ga,e>n?(t.won+=1,t.points+=3):e<n?t.lost+=1:(t.drawn+=1,t.points+=1)}function p(t){return t.status==="finished"?`FT — ${t.home} ${t.homeScore}–${t.awayScore} ${t.away}`:t.status==="live"?`LIVE ${t.minute||""}' — ${t.home} ${t.homeScore??0}–${t.awayScore??0} ${t.away}`:t.status==="scheduled"?y(t.kickoff):t.status==="postponed"?"Postponed":"Status unavailable"}function y(t){if(!t)return"Kickoff TBA";const e=new Date(t);return Number.isNaN(e.getTime())?"Kickoff TBA":e.toLocaleString(void 0,{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}function T(t,e,n){const o=new Date().toISOString().slice(0,10),a=t.matches.filter(d=>(d.kickoff||"").startsWith(o))[0]||t.matches[0],i=t.matches.find(d=>d.home==="Mexico"||d.away==="Mexico");return`
    <section class="hero">
      <div>
        <p class="eyebrow">Tournament companion</p>
        <h2>Clickable schedule, computed standings, and reliable match states.</h2>
        <p>No more dead overview buttons or endless loading placeholders.</p>
      </div>
      <div class="score-card">
        <span class="pill">Featured</span>
        <h3>${a.home} vs ${a.away}</h3>
        <p>${p(a)}</p>
        <button data-route="match/${a.id}">Open match</button>
      </div>
    </section>

    <section class="grid cards">
      ${l("schedule","Schedule","Browse fixtures by date, group, venue, and favorites.")}
      ${l("standings","Standings","Live group tables computed from finished match results.")}
      ${l("teams","Teams",`${n.length} favorite team${n.length===1?"":"s"} saved locally.`)}
      ${l(`match/${(i==null?void 0:i.id)||a.id}`,"Mexico latest",i?p(i):"Open featured match")}
    </section>

    <section class="panel">
      <h2>Group A snapshot</h2>
      ${L(e.A||[])}
    </section>
  `}function l(t,e,n){return`<button class="overview-card" data-route="${t}"><h3>${e}</h3><p>${n}</p><span>Open →</span></button>`}function L(t){return`<table><thead><tr><th>Team</th><th>Pts</th><th>GD</th><th>P</th></tr></thead><tbody>${t.map(e=>`<tr><td>${e.team}</td><td>${e.points}</td><td>${e.gd}</td><td>${e.played}</td></tr>`).join("")}</tbody></table>`}function O(t,e){const n=t.matches.reduce((o,s)=>{const a=(s.kickoff||"TBA").slice(0,10);return(o[a]??(o[a]=[])).push(s),o},{});return`
    <section class="panel"><h2>Schedule</h2><p>Tap any match to open details. Star teams from the Teams page to highlight them here.</p></section>
    ${Object.entries(n).map(([o,s])=>`
      <section class="panel">
        <h3>${o}</h3>
        <div class="match-list">
          ${s.map(a=>j(a,e)).join("")}
        </div>
      </section>
    `).join("")}
  `}function j(t,e){return`<button class="match-card ${e.includes(t.home)||e.includes(t.away)?"favorite":""}" data-route="match/${t.id}">
    <span class="pill">${t.group}</span>
    <strong>${t.home} vs ${t.away}</strong>
    <span>${p(t)}</span>
    <small>${t.venue||"Venue TBA"}</small>
  </button>`}function k(t){return Object.entries(t).map(([e,n])=>`
    <section class="panel">
      <h2>Group ${e}</h2>
      <table>
        <thead><tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead>
        <tbody>${n.map(o=>`<tr><td>${o.team}</td><td>${o.played}</td><td>${o.won}</td><td>${o.drawn}</td><td>${o.lost}</td><td>${o.gf}</td><td>${o.ga}</td><td>${o.gd}</td><td><strong>${o.points}</strong></td></tr>`).join("")}</tbody>
      </table>
    </section>
  `).join("")}function A(t,e){return`<section class="grid cards">${t.teams.map(n=>`
    <article class="team-card">
      <p class="eyebrow">Group ${n.group}</p>
      <h3>${n.name}</h3>
      <p>${n.code}</p>
      <button data-favorite="${n.name}">${e.includes(n.name)?"★ Favorite":"☆ Add favorite"}</button>
    </article>
  `).join("")}</section>`}function M(t,e,n){const o=t.matches.find(a=>String(a.id)===String(e));if(!o)return'<section class="panel"><h2>Match not found</h2><button data-route="schedule">Back to schedule</button></section>';const s=t.venues.find(a=>a.name===o.venue);return`
    <section class="panel match-detail">
      <button data-route="schedule">← Back to schedule</button>
      <p class="eyebrow">${o.group}</p>
      <h2>${o.home} vs ${o.away}</h2>
      <p class="status-line">${p(o)}</p>
      <p>Kickoff: ${y(o.kickoff)}</p>
      <p>Venue: ${o.venue||"TBA"}${s?` — ${s.city}`:""}</p>
    </section>
    <section class="panel"><h3>Group table</h3>${P(n[o.group]||[])}</section>
  `}function P(t){return`<table><thead><tr><th>Team</th><th>Pts</th><th>GD</th><th>P</th></tr></thead><tbody>${t.map(e=>`<tr><td>${e.team}</td><td>${e.points}</td><td>${e.gd}</td><td>${e.played}</td></tr>`).join("")}</tbody></table>`}const m=document.querySelector("#app");let r={route:location.hash.replace("#","")||"overview",data:null,error:null,favorites:JSON.parse(localStorage.getItem("wc26:favorites")||"[]")};function D(t){r.route=t||"overview",history.pushState(null,"",`#${r.route}`),c()}function N(t){const e=new Set(r.favorites);e.has(t)?e.delete(t):e.add(t),r.favorites=[...e],localStorage.setItem("wc26:favorites",JSON.stringify(r.favorites)),c()}function $(t){var n,o;const e=((o=(n=r.data)==null?void 0:n.meta)==null?void 0:o.lastUpdated)||"unknown";return`
    <header class="topbar">
      <div>
        <p class="eyebrow">World Cup 2026</p>
        <h1>WC26 Dashboard</h1>
      </div>
      <nav>
        ${h("overview","Overview")}
        ${h("schedule","Schedule")}
        ${h("standings","Standings")}
        ${h("teams","Teams")}
      </nav>
    </header>
    <main>${t}</main>
    <footer>Last updated: ${e}</footer>
  `}function h(t,e){return`<button class="nav ${r.route===t?"active":""}" data-route="${t}">${e}</button>`}function c(){if(r.error){m.innerHTML=$(`<section class="panel"><h2>Data unavailable</h2><p>${r.error}</p></section>`),g();return}if(!r.data){m.innerHTML=$('<section class="panel"><h2>Loading dashboard data…</h2><p>Fetching static match, team, and venue files.</p></section>'),g();return}const t=w(r.data.matches,r.data.teams),e=r.route;let n="";e.startsWith("match/")?n=M(r.data,e.split("/")[1],t):e==="schedule"?n=O(r.data,r.favorites):e==="standings"?n=k(t):e==="teams"?n=A(r.data,r.favorites):n=T(r.data,t,r.favorites),m.innerHTML=$(n),g(),B()}function g(){document.querySelectorAll("[data-route]").forEach(t=>{t.addEventListener("click",()=>D(t.dataset.route))})}function B(){document.querySelectorAll("[data-favorite]").forEach(t=>{t.addEventListener("click",()=>N(t.dataset.favorite))})}window.addEventListener("popstate",()=>{r.route=location.hash.replace("#","")||"overview",c()});c();b().then(t=>{r.data=t,c()}).catch(t=>{r.error=t.message,c()});
