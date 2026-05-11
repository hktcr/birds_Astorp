---
title: "De Efterlysta"
description: "Åstorps 54 kalla fall – en jakt på kommunens mest saknade arter"
layout: "efterlysta"
---

<div style="max-width: 800px; margin: 0 auto; text-align: center; padding: 2rem 0;">
<h1 style="font-size: 3rem; margin-bottom: 0.5rem; color: var(--text-color);">DE EFTERLYSTA</h1>
<p style="font-size: 1.25rem; opacity: 0.8; margin-bottom: 2rem;">Åstorps 54 kalla fall</p>
<p style="font-size: 1.1rem; line-height: 1.6; text-align: left; opacity: 0.9; margin-bottom: 3rem;">
Efter en systematisk genomgång av Skånes fågelfauna har jag valt ut 54 arter som utgör tydliga luckor i Åstorps kommun. Det rör sig om arter som med ganska stor sannolikhet skulle kunna dyka upp inom Åstorps kommun. Målet är att systematiskt minska antalet oöppnade kort i galleriet nedan.
</p>
</div>

<style>
.bounty-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1.5rem;
    margin-top: 2rem;
    padding-bottom: 4rem;
    align-items: start;
}
.bounty-card {
    background: var(--bg-alt);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.5rem 1rem;
    text-align: center;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s;
    position: relative;
    overflow: hidden;
    cursor: pointer;
}
.bounty-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}

/* Peak Month Spotlight Effect */
.bounty-card.spotlight-active {
    border-color: rgba(250, 204, 21, 0.5);
    box-shadow: 0 0 15px rgba(250, 204, 21, 0.1);
}

/* Active Right Now Effect (Orange) */
.bounty-card.active-now {
    border-color: rgba(249, 115, 22, 0.9);
    box-shadow: 0 0 25px rgba(249, 115, 22, 0.3), inset 0 0 15px rgba(249, 115, 22, 0.1);
}
.bounty-card.active-now .bounty-icon {
    filter: drop-shadow(0px 4px 10px rgba(249, 115, 22, 0.7));
    opacity: 0.95;
}
.bounty-card.active-now .bounty-status {
    background-color: rgba(249, 115, 22, 0.15);
    color: #c2410c;
    border-color: #f97316;
    animation: pulse-orange 1.5s infinite;
}

@keyframes pulse {
    0% { transform: rotate(5deg) scale(1); }
    50% { transform: rotate(5deg) scale(1.08); }
    100% { transform: rotate(5deg) scale(1); }
}

@keyframes pulse-orange {
    0% { transform: rotate(5deg) scale(1); box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); }
    70% { transform: rotate(5deg) scale(1.1); box-shadow: 0 0 0 10px rgba(249, 115, 22, 0); }
    100% { transform: rotate(5deg) scale(1); box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
}

.bounty-status {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 10;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;
    color: #6b7280;
    border: 1px solid #9ca3af;
    padding: 2px 6px;
    border-radius: 4px;
    transform: rotate(5deg);
    transition: all 0.3s;
}
.bounty-icon {
    width: 140px;
    height: 140px;
    margin: 0 auto 1.5rem;
    opacity: 0.6;
    display: block;
    object-fit: contain;
    filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.3));
    transition: all 0.3s;
}
.bounty-name {
    font-weight: 600;
    font-size: 1.1rem;
    margin-bottom: 0.25rem;
}
.bounty-latin {
    font-style: italic;
    font-size: 0.85rem;
    opacity: 0.7;
    margin-bottom: 0.5rem;
}

/* Expansion logic */
.bounty-card .obs-list {
    display: none;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(0,0,0,0.1);
    text-align: left;
    font-size: 0.85rem;
}
.bounty-card.expanded .obs-list {
    display: block;
    animation: fadeIn 0.3s ease;
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
}
.obs-item {
    margin-bottom: 0.5rem;
}
.obs-date {
    font-weight: bold;
    color: var(--text-color);
}
.obs-loc {
    color: var(--text-muted, #666);
}
</style>

<div class="bounty-grid" id="bountyGrid">
<div class="bounty-card" data-peak-months="[]" data-active-now="true" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Småskrake</div>
<div class="bounty-latin">Mergus serrator</div>
<div class='obs-list'><strong>Senaste fynden (Skåne):</strong><br><br><div class='obs-item'><span class='obs-date'></span> &ndash; 2 ex<br><span class='obs-loc'>Simrishamn</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 63 ex<br><span class='obs-loc'>Ystad</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 2 ex<br><span class='obs-loc'>Lomma</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 22 ex<br><span class='obs-loc'>Trelleborg</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Helsingborg</span></div></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="true" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Sjöorre</div>
<div class="bounty-latin">Melanitta nigra</div>
<div class='obs-list'><strong>Senaste fynden (Skåne):</strong><br><br><div class='obs-item'><span class='obs-date'></span> &ndash; 272 ex<br><span class='obs-loc'>Ystad</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 45 ex<br><span class='obs-loc'>Ystad</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 135 ex<br><span class='obs-loc'>Ystad</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 175 ex<br><span class='obs-loc'>Trelleborg</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 40 ex<br><span class='obs-loc'>Lomma</span></div></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="true" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Alfågel</div>
<div class="bounty-latin">Clangula hyemalis</div>
<div class='obs-list'><strong>Senaste fynden (Skåne):</strong><br><br><div class='obs-item'><span class='obs-date'></span> &ndash; 10 ex<br><span class='obs-loc'>Simrishamn</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 4 ex<br><span class='obs-loc'>Ystad</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 5 ex<br><span class='obs-loc'>Simrishamn</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 10 ex<br><span class='obs-loc'>Ystad</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 3 ex<br><span class='obs-loc'>Ystad</span></div></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="true" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Svärta</div>
<div class="bounty-latin">Melanitta fusca</div>
<div class='obs-list'><strong>Senaste fynden (Skåne):</strong><br><br><div class='obs-item'><span class='obs-date'></span> &ndash; 4 ex<br><span class='obs-loc'>Kristianstad</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Örkelljunga</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 32 ex<br><span class='obs-loc'>Vellinge</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 43 ex<br><span class='obs-loc'>Trelleborg</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 81 ex<br><span class='obs-loc'>Ystad</span></div></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Bergand</div>
<div class="bounty-latin">Aythya marila</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Rödhalsad gås</div>
<div class="bounty-latin">Branta ruficollis</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Rödhuvad dykand</div>
<div class="bounty-latin">Netta rufina</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="true" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Skäggdopping</div>
<div class="bounty-latin">Podiceps cristatus</div>
<div class='obs-list'><strong>Senaste fynden (Skåne):</strong><br><br><div class='obs-item'><span class='obs-date'></span> &ndash; 5 ex<br><span class='obs-loc'>Lund</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Kristianstad</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Lund</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 4 ex<br><span class='obs-loc'>Lund</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Helsingborg</span></div></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="true" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Storlom</div>
<div class="bounty-latin">Gavia arctica</div>
<div class='obs-list'><strong>Senaste fynden (Skåne):</strong><br><br><div class='obs-item'><span class='obs-date'></span> &ndash; 10 ex<br><span class='obs-loc'>Vellinge</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Malmö</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 3 ex<br><span class='obs-loc'>Helsingborg</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 5 ex<br><span class='obs-loc'>Ystad</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 9 ex<br><span class='obs-loc'>Ystad</span></div></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="true" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Smålom</div>
<div class="bounty-latin">Gavia stellata</div>
<div class='obs-list'><strong>Senaste fynden (Skåne):</strong><br><br><div class='obs-item'><span class='obs-date'></span> &ndash; 2 ex<br><span class='obs-loc'>Lomma</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Lomma</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Malmö</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 14 ex<br><span class='obs-loc'>Trelleborg</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 16 ex<br><span class='obs-loc'>Lomma</span></div></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Svarthakedopping</div>
<div class="bounty-latin">Podiceps auritus</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="true" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Rördrom</div>
<div class="bounty-latin">Botaurus stellaris</div>
<div class='obs-list'><strong>Senaste fynden (Skåne):</strong><br><br><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Hässleholm</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Kristianstad</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Kristianstad</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Kristianstad</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Vellinge</span></div></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Ängshök</div>
<div class="bounty-latin">Circus pygargus</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Mindre skrikörn</div>
<div class="bounty-latin">Clanga pomarina</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="true" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Kärrsnäppa</div>
<div class="bounty-latin">Calidris alpina</div>
<div class='obs-list'><strong>Senaste fynden (Skåne):</strong><br><br><div class='obs-item'><span class='obs-date'></span> &ndash; 27 ex<br><span class='obs-loc'>Helsingborg</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Höganäs</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 10 ex<br><span class='obs-loc'>Malmö</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 4 ex<br><span class='obs-loc'>Helsingborg</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 4 ex<br><span class='obs-loc'>Helsingborg</span></div></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="true" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Myrspov</div>
<div class="bounty-latin">Limosa lapponica</div>
<div class='obs-list'><strong>Senaste fynden (Skåne):</strong><br><br><div class='obs-item'><span class='obs-date'></span> &ndash; 70 ex<br><span class='obs-loc'>Helsingborg</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 54 ex<br><span class='obs-loc'>Lomma</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Höganäs</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Helsingborg</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 4 ex<br><span class='obs-loc'>Burlöv</span></div></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Kustpipare</div>
<div class="bounty-latin">Pluvialis squatarola</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Kustsnäppa</div>
<div class="bounty-latin">Calidris canutus</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Spovsnäppa</div>
<div class="bounty-latin">Calidris ferruginea</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Sandlöpare</div>
<div class="bounty-latin">Calidris alba</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="true" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Roskarl</div>
<div class="bounty-latin">Arenaria interpres</div>
<div class='obs-list'><strong>Senaste fynden (Skåne):</strong><br><br><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Kristianstad</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 2 ex<br><span class='obs-loc'>Lomma</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Helsingborg</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Helsingborg</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Båstad</span></div></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Myrsnäppa</div>
<div class="bounty-latin">Calidris falcinellus</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Smalnäbbad simsnäppa</div>
<div class="bounty-latin">Phalaropus lobatus</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Fjällpipare</div>
<div class="bounty-latin">Eudromias morinellus</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Dammsnäppa</div>
<div class="bounty-latin">Tringa stagnatilis</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Tuvsnäppa</div>
<div class="bounty-latin">Calidris melanotos</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="true" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Dvärgmås</div>
<div class="bounty-latin">Hydrocoloeus minutus</div>
<div class='obs-list'><strong>Senaste fynden (Skåne):</strong><br><br><div class='obs-item'><span class='obs-date'></span> &ndash; 2 ex<br><span class='obs-loc'>Ystad</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 5 ex<br><span class='obs-loc'>Helsingborg</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Lund</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 9 ex<br><span class='obs-loc'>Lund</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Lund</span></div></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="true" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Småtärna</div>
<div class="bounty-latin">Sternula albifrons</div>
<div class='obs-list'><strong>Senaste fynden (Skåne):</strong><br><br><div class='obs-item'><span class='obs-date'></span> &ndash; 2 ex<br><span class='obs-loc'>Kristianstad</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 3 ex<br><span class='obs-loc'>Burlöv</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Kristianstad</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 10 ex<br><span class='obs-loc'>Lomma</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 2 ex<br><span class='obs-loc'>Lomma</span></div></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="true" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Skräntärna</div>
<div class="bounty-latin">Hydroprogne caspia</div>
<div class='obs-list'><strong>Senaste fynden (Skåne):</strong><br><br><div class='obs-item'><span class='obs-date'></span> &ndash; 2 ex<br><span class='obs-loc'>Lomma</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Trelleborg</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 2 ex<br><span class='obs-loc'>Lund</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Burlöv</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 2 ex<br><span class='obs-loc'>Lund</span></div></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="true" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Silvertärna</div>
<div class="bounty-latin">Sterna paradisaea</div>
<div class='obs-list'><strong>Senaste fynden (Skåne):</strong><br><br><div class='obs-item'><span class='obs-date'></span> &ndash; 4 ex<br><span class='obs-loc'>Kristianstad</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 60 ex<br><span class='obs-loc'>Skurup</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 2 ex<br><span class='obs-loc'>Lomma</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 2 ex<br><span class='obs-loc'>Kristianstad</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 2 ex<br><span class='obs-loc'>Lomma</span></div></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="true" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Svarttärna</div>
<div class="bounty-latin">Chlidonias niger</div>
<div class='obs-list'><strong>Senaste fynden (Skåne):</strong><br><br><div class='obs-item'><span class='obs-date'></span> &ndash; 10 ex<br><span class='obs-loc'>Lund</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 4 ex<br><span class='obs-loc'>Lund</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 5 ex<br><span class='obs-loc'>Lund</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 15 ex<br><span class='obs-loc'>Lomma</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Helsingborg</span></div></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Tretåig mås</div>
<div class="bounty-latin">Rissa tridactyla</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Medelhavstrut</div>
<div class="bounty-latin">Larus michahellis</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Vitvingad tärna</div>
<div class="bounty-latin">Chlidonias leucopterus</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Sparvuggla</div>
<div class="bounty-latin">Glaucidium passerinum</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Pärluggla</div>
<div class="bounty-latin">Aegolius funereus</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Hökuggla</div>
<div class="bounty-latin">Surnia ulula</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Biätare</div>
<div class="bounty-latin">Merops apiaster</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="true" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Härfågel</div>
<div class="bounty-latin">Upupa epops</div>
<div class='obs-list'><strong>Senaste fynden (Skåne):</strong><br><br><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Vellinge</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Vellinge</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Vellinge</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Landskrona</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Lund</span></div></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="true" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Skäggmes</div>
<div class="bounty-latin">Panurus biarmicus</div>
<div class='obs-list'><strong>Senaste fynden (Skåne):</strong><br><br><div class='obs-item'><span class='obs-date'></span> &ndash; 2 ex<br><span class='obs-loc'>Kristianstad</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 2 ex<br><span class='obs-loc'>Lomma</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 4 ex<br><span class='obs-loc'>Lomma</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 2 ex<br><span class='obs-loc'>Kristianstad</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Malmö</span></div></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Rosenfink</div>
<div class="bounty-latin">Carpodacus erythrinus</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="true" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Svarthakad buskskvätta</div>
<div class="bounty-latin">Saxicola rubicola</div>
<div class='obs-list'><strong>Senaste fynden (Skåne):</strong><br><br><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Bromölla</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Bromölla</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Lund</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Höganäs</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 2 ex<br><span class='obs-loc'>Höganäs</span></div></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="true" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Sommargylling</div>
<div class="bounty-latin">Oriolus oriolus</div>
<div class='obs-list'><strong>Senaste fynden (Skåne):</strong><br><br><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Lund</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 2 ex<br><span class='obs-loc'>Lund</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Lund</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Kristianstad</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Lund</span></div></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Pungmes</div>
<div class="bounty-latin">Remiz pendulinus</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Lappsparv</div>
<div class="bounty-latin">Calcarius lapponicus</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Berglärka</div>
<div class="bounty-latin">Eremophila alpestris</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Ortolansparv</div>
<div class="bounty-latin">Emberiza hortulana</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Blåhake</div>
<div class="bounty-latin">Luscinia svecica</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Tajgasångare</div>
<div class="bounty-latin">Phylloscopus inornatus</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Flodsångare</div>
<div class="bounty-latin">Locustella fluviatilis</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="true" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Vassångare</div>
<div class="bounty-latin">Locustella luscinioides</div>
<div class='obs-list'><strong>Senaste fynden (Skåne):</strong><br><br><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Hässleholm</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Kristianstad</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Kristianstad</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Kristianstad</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Kristianstad</span></div></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Höksångare</div>
<div class="bounty-latin">Curruca nisoria</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="false" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Större piplärka</div>
<div class="bounty-latin">Anthus richardi</div>
<div class='obs-list'><em>Inga rapporter i Skåne de senaste 7 dagarna.</em></div></div>
<div class="bounty-card" data-peak-months="[]" data-active-now="true" onclick="this.classList.toggle('expanded')">
<div class="bounty-status">Missing</div>
<img class="bounty-icon" src="/images/most-wanted.png" alt="Silhouette of a bird">
<div class="bounty-name">Citronärla</div>
<div class="bounty-latin">Motacilla citreola</div>
<div class='obs-list'><strong>Senaste fynden (Skåne):</strong><br><br><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Simrishamn</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Simrishamn</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Simrishamn</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Simrishamn</span></div><div class='obs-item'><span class='obs-date'></span> &ndash; 1 ex<br><span class='obs-loc'>Simrishamn</span></div></div></div>
</div>

<script>
(function() {
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const cards = document.querySelectorAll(".bounty-card");
    
    cards.forEach(card => {
        try {
            const isActiveNow = card.getAttribute("data-active-now") === "true";
            const peakMonths = JSON.parse(card.getAttribute("data-peak-months"));
            const statusEl = card.querySelector(".bounty-status");
            
            if (isActiveNow) {
                // Priority 1: Active RIGHT NOW in Skåne
                card.classList.add("active-now");
                if (statusEl) {
                    statusEl.textContent = "AKTUELL NU";
                }
            } else if (peakMonths && peakMonths.includes(currentMonth)) {
                // Priority 2: General High Season
                card.classList.add("spotlight-active");
                if (statusEl) {
                    statusEl.textContent = "HÖGSÄSONG";
                    statusEl.style.color = "#ca8a04";
                    statusEl.style.borderColor = "#facc15";
                }
            }
        } catch(e) {
            console.error("Error parsing peak months", e);
        }
    });
})();
</script>
