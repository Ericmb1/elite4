"use client";

import { useState, useEffect, useRef } from "react";
import { authClient } from "@/lib/auth-client";
import { getStats, saveStats } from "@/app/actions/stats";
import { Chiptune } from "@/lib/chiptune";

const GB = {
  darkest:'#1a1c2c', dark:'#3a2f5e', mid:'#6b4fa0', light:'#a880d8',
  lightest:'#e8d8f8', accent:'#c9a0f0', dim:'#7a5fa8', text:'#e8d8f8',
  textDim:'#a880d8', win:'#f0c040', lose:'#e05050', border:'#c9a0f0', shiny:'#ffe066',
};

const BATTLES = [
  { name:'Brock',     title:'Badge 1',    threshold:2178, type:'Rock',     img:'https://img.pokemondb.net/artwork/brock.jpg' },
  { name:'Misty',     title:'Badge 2',    threshold:2468, type:'Water',    img:'https://img.pokemondb.net/artwork/misty.jpg' },
  { name:'Lt. Surge', title:'Badge 3',    threshold:2759, type:'Electric', img:'https://img.pokemondb.net/artwork/lt-surge.jpg' },
  { name:'Erika',     title:'Badge 4',    threshold:3049, type:'Grass',    img:'https://img.pokemondb.net/artwork/erika.jpg' },
  { name:'Koga',      title:'Badge 5',    threshold:3340, type:'Poison',   img:'https://img.pokemondb.net/artwork/koga.jpg' },
  { name:'Sabrina',   title:'Badge 6',    threshold:3703, type:'Psychic',  img:'https://img.pokemondb.net/artwork/sabrina.jpg' },
  { name:'Blaine',    title:'Badge 7',    threshold:4066, type:'Fire',     img:'https://img.pokemondb.net/artwork/blaine.jpg' },
  { name:'Giovanni',  title:'Badge 8',    threshold:4429, type:'Ground',   img:'https://img.pokemondb.net/artwork/giovanni.jpg' },
  { name:'Lorelei',   title:'Elite Four', threshold:4792, type:'Ice',      img:'https://img.pokemondb.net/artwork/lorelei.jpg' },
  { name:'Bruno',     title:'Elite Four', threshold:5227, type:'Fighting', img:'https://img.pokemondb.net/artwork/bruno.jpg' },
  { name:'Agatha',    title:'Elite Four', threshold:5010, type:'Ghost',    img:'https://img.pokemondb.net/artwork/agatha.jpg' },
  { name:'Lance',     title:'Champion',   threshold:5663, type:'Dragon',   img:'https://img.pokemondb.net/artwork/lance.jpg' },
];

const ATTACKING_CHART = {
  Normal:   { superVs:[],                                      weakVs:['Rock','Steel'],                                     immuneVs:['Ghost'] },
  Fire:     { superVs:['Grass','Ice','Bug','Steel'],           weakVs:['Fire','Water','Rock','Dragon'],                     immuneVs:[] },
  Water:    { superVs:['Fire','Ground','Rock'],                weakVs:['Water','Grass','Dragon'],                           immuneVs:[] },
  Electric: { superVs:['Water','Flying'],                      weakVs:['Electric','Grass','Dragon'],                        immuneVs:['Ground'] },
  Grass:    { superVs:['Water','Ground','Rock'],               weakVs:['Fire','Grass','Poison','Flying','Bug','Dragon','Steel'], immuneVs:[] },
  Ice:      { superVs:['Grass','Ground','Flying','Dragon'],    weakVs:['Steel','Fire','Water','Ice'],                       immuneVs:[] },
  Fighting: { superVs:['Normal','Ice','Rock','Dark','Steel'],  weakVs:['Poison','Bug','Psychic','Flying','Fairy'],          immuneVs:['Ghost'] },
  Poison:   { superVs:['Grass','Fairy'],                       weakVs:['Poison','Ground','Rock','Ghost'],                   immuneVs:['Steel'] },
  Ground:   { superVs:['Fire','Electric','Poison','Rock','Steel'], weakVs:['Grass','Bug'],                                  immuneVs:['Flying'] },
  Flying:   { superVs:['Grass','Fighting','Bug'],              weakVs:['Electric','Rock','Steel'],                          immuneVs:[] },
  Psychic:  { superVs:['Fighting','Poison'],                   weakVs:['Psychic','Steel'],                                  immuneVs:['Dark'] },
  Bug:      { superVs:['Grass','Psychic','Dark'],              weakVs:['Fire','Fighting','Flying','Ghost','Steel','Fairy'],  immuneVs:[] },
  Rock:     { superVs:['Fire','Ice','Flying','Bug'],           weakVs:['Fighting','Ground','Steel'],                        immuneVs:[] },
  Ghost:    { superVs:['Psychic','Ghost'],                     weakVs:['Dark'],                                             immuneVs:['Normal','Fighting'] },
  Dragon:   { superVs:['Dragon'],                              weakVs:['Steel'],                                            immuneVs:['Fairy'] },
  Dark:     { superVs:['Psychic','Ghost'],                     weakVs:['Fighting','Dark','Fairy'],                          immuneVs:[] },
  Steel:    { superVs:['Ice','Rock','Fairy'],                  weakVs:['Steel','Fire','Water','Electric','Grass','Ice','Flying','Psychic','Bug','Rock','Dragon','Fairy'], immuneVs:[] },
  Fairy:    { superVs:['Fighting','Dragon','Dark'],            weakVs:['Poison','Steel','Fire'],                            immuneVs:[] },
};

function getBestMult(teamTypes, oppType) {
  let best = 0.5;
  for (const types of teamTypes) {
    let m = 1;
    for (const t of types) {
      const c = ATTACKING_CHART[t];
      if (!c) continue;
      if (c.immuneVs.includes(oppType)) { m = 0; break; }
      if (c.superVs.includes(oppType)) m *= 2;
      else if (c.weakVs.includes(oppType)) m *= 0.5;
    }
    if (m > best) best = m;
  }
  return best;
}

const LEGENDARY_DEX = new Set([144,145,146,150,151,243,244,245,249,250,251,377,378,379,380,381,382,383,384,385,386,480,481,482,483,484,485,486,487,488,491,492,493]);

const GEN_RANGES = [{ min:1,max:151 },{ min:152,max:251 },{ min:252,max:386 },{ min:387,max:493 }];
const GEN_LABELS = ['Gen I','Gen II','Gen III','Gen IV'];

// ── ACHIEVEMENTS ──────────────────────────────────────────────
function genSeenCount(seen, gen) {
  const r = GEN_RANGES[gen];
  return seen.filter(d => d >= r.min && d <= r.max).length;
}
function genTotal(gen) {
  const r = GEN_RANGES[gen];
  return RAW_UNIQUE.filter(e => e[7] >= r.min && e[7] <= r.max).length;
}

const ALL_ACHIEVEMENTS = [
  { id:'first_catch',  icon:'🎣', title:"Gotta Catch 'Em",      desc:'Complete your first team catch.',               check: s => s.totalRuns >= 1 },
  { id:'first_badge',  icon:'🏅', title:'Badge Collector',        desc:'Beat your first gym leader.',                  check: s => s.bestRun >= 1 },
  { id:'halfway',      icon:'⚔️', title:'Halfway There',          desc:'Clear 6 badges in a single run.',              check: s => s.bestRun >= 6 },
  { id:'elite_entry',  icon:'🚪', title:'Knocking on the Door',   desc:'Make it to the Elite Four.',                   check: s => s.bestRun >= 9 },
  { id:'champion',     icon:'🏆', title:'Champion!',              desc:'Defeat Lance and become Champion.',            check: s => s.totalWins >= 1 },
  { id:'repeat_champ', icon:'👑', title:'Defending Champion',     desc:'Become Champion 3 times.',                     check: s => s.totalWins >= 3 },
  { id:'legendary',    icon:'⭐', title:"You're A Legend",        desc:'Catch a Legendary Pokémon.',                   check: s => s.legendariesCaught >= 1 },
  { id:'legend_squad', icon:'🌟', title:'Legendary Squad',        desc:'Catch 10 Legendary Pokémon total.',            check: s => s.legendariesCaught >= 10 },
  { id:'first_shiny',  icon:'✨', title:'A Wild Shiny Appeared!', desc:'Catch your first Shiny Pokémon.',             check: s => s.shiniesCaught >= 1 },
  { id:'shiny_hunter', icon:'💎', title:'Shiny Hunter',           desc:'Catch 5 Shiny Pokémon.',                      check: s => s.shiniesCaught >= 5 },
  { id:'runs10',       icon:'🔄', title:'Persistent Trainer',     desc:'Complete 10 runs.',                            check: s => s.totalRuns >= 10 },
  { id:'runs50',       icon:'🎖️', title:'Seasoned Veteran',       desc:'Complete 50 runs.',                            check: s => s.totalRuns >= 50 },
  { id:'no_rerolls',   icon:'🎲', title:'Rolling the Dice',       desc:'Beat 8+ badges without using any rerolls.',   check: s => (s.bestRunNoReroll||0) >= 8 },
  { id:'shiny_champ',  icon:'🌠', title:'Shooting Star',          desc:'Become Champion with a Shiny on your team.', check: s => (s.shinyChampion||0) >= 1 },
  { id:'seen_gen1',    icon:'👁️', title:'Kanto Explorer',         desc:'See all Gen I Pokémon.',   check: s => genSeenCount(s.seen||[],0) >= genTotal(0) },
  { id:'seen_gen2',    icon:'👁️', title:'Johto Explorer',         desc:'See all Gen II Pokémon.',  check: s => genSeenCount(s.seen||[],1) >= genTotal(1) },
  { id:'seen_gen3',    icon:'👁️', title:'Hoenn Explorer',         desc:'See all Gen III Pokémon.', check: s => genSeenCount(s.seen||[],2) >= genTotal(2) },
  { id:'seen_gen4',    icon:'👁️', title:'Sinnoh Explorer',        desc:'See all Gen IV Pokémon.',  check: s => genSeenCount(s.seen||[],3) >= genTotal(3) },
  { id:'pc_10',        icon:'📦', title:'Just Getting Started',   desc:'Catch 10 Pokémon for your PC.',               check: s => (s.pokedex||[]).length >= 10 },
  { id:'pc_25',        icon:'🗂️', title:'Collector',              desc:'Catch 25 Pokémon for your PC.',               check: s => (s.pokedex||[]).length >= 25 },
  { id:'pc_50',        icon:'🗃️', title:'Hoarder',                desc:'Catch 50 Pokémon for your PC.',               check: s => (s.pokedex||[]).length >= 50 },
  { id:'pc_100',       icon:'💯', title:'PC is Full!',            desc:'Fill your PC to 100 Pokémon.',                check: s => (s.pokedex||[]).length >= 100 },
  { id:'shiny_keep',   icon:'🌈', title:'Precious Cargo',         desc:'Catch a Shiny Pokémon for your PC.',          check: s => (s.pokedex||[]).some(p => p.isShiny) },
  { id:'legend_keep',  icon:'🔱', title:'Legendary Collection',   desc:'Catch a Legendary for your PC.',              check: s => (s.pokedex||[]).some(p => p.isLegendary) },
  { id:'missingno',    icon:'🌀', title:'ERR0R: ¿?¿?¿?¿?',        desc:'Encounter the glitch known as MissingNo.',    check: s => (s.metMissingNo||0) >= 1 },
];

function getNewAchievements(oldStats, newStats) {
  const old = oldStats.achievements || [];
  return ALL_ACHIEVEMENTS.filter(a => !old.includes(a.id) && a.check(newStats));
}

// ── POKEMON DATA ──────────────────────────────────────────────
const RAW = [
  ['Bulbasaur',45,49,49,65,65,45,1,'Grass','Poison',2],['Ivysaur',60,62,63,80,80,60,2,'Grass','Poison',3],['Venusaur',80,82,83,100,100,80,3,'Grass','Poison',null],
  ['Charmander',39,52,43,60,50,65,4,'Fire',null,5],['Charmeleon',58,64,58,80,65,80,5,'Fire',null,6],['Charizard',78,84,78,109,85,100,6,'Fire','Flying',null],
  ['Squirtle',44,48,65,50,64,43,7,'Water',null,8],['Wartortle',59,63,80,65,80,58,8,'Water',null,9],['Blastoise',79,83,100,85,105,78,9,'Water',null,null],
  ['Caterpie',45,30,35,20,20,45,10,'Bug',null,11],['Metapod',50,20,55,25,25,30,11,'Bug',null,12],['Butterfree',60,45,50,90,80,70,12,'Bug','Flying',null],
  ['Weedle',35,35,30,20,20,50,13,'Bug','Poison',14],['Kakuna',45,25,50,25,25,35,14,'Bug','Poison',15],['Beedrill',65,90,40,45,80,75,15,'Bug','Poison',null],
  ['Pidgey',40,45,40,35,35,56,16,'Normal','Flying',17],['Pidgeotto',63,60,55,50,50,71,17,'Normal','Flying',18],['Pidgeot',83,80,75,70,70,101,18,'Normal','Flying',null],
  ['Rattata',30,56,35,25,35,72,19,'Normal',null,20],['Raticate',55,81,60,50,70,97,20,'Normal',null,null],
  ['Pikachu',35,55,40,50,50,90,25,'Electric',null,26],['Raichu',60,90,55,90,80,110,26,'Electric',null,null],
  ['Sandshrew',50,75,85,20,30,40,27,'Ground',null,28],['Sandslash',75,100,110,45,55,65,28,'Ground',null,null],
  ['Nidoqueen',90,92,87,75,85,76,31,'Poison','Ground',null],['Nidoking',81,102,77,85,75,85,34,'Poison','Ground',null],
  ['Clefairy',70,45,48,60,65,35,35,'Normal','Fairy',36],['Clefable',95,70,73,95,90,60,36,'Normal','Fairy',null],
  ['Vulpix',38,41,40,50,65,65,37,'Fire',null,38],['Ninetales',73,76,75,81,100,100,38,'Fire',null,null],
  ['Jigglypuff',115,45,20,45,25,20,39,'Normal','Fairy',40],['Wigglytuff',140,70,45,85,50,45,40,'Normal','Fairy',null],
  ['Golbat',75,80,70,65,75,90,42,'Poison','Flying',169],['Vileplume',75,80,85,110,90,50,45,'Grass','Poison',null],
  ['Parasect',60,95,80,60,80,30,47,'Bug','Grass',null],['Venomoth',70,65,60,90,75,90,49,'Bug','Poison',null],
  ['Dugtrio',35,100,50,50,70,120,51,'Ground',null,null],['Persian',65,70,60,65,65,115,53,'Normal',null,null],
  ['Golduck',80,82,78,95,80,85,55,'Water',null,null],['Primeape',65,105,60,60,70,95,57,'Fighting',null,null],
  ['Arcanine',90,110,80,100,80,95,59,'Fire',null,null],['Poliwrath',90,95,95,70,90,70,62,'Water','Fighting',null],
  ['Alakazam',55,50,45,135,95,120,65,'Psychic',null,null],['Machamp',90,130,80,65,85,55,68,'Fighting',null,null],
  ['Victreebel',80,105,65,100,70,70,71,'Grass','Poison',null],['Tentacruel',80,70,65,80,120,100,73,'Water','Poison',null],
  ['Golem',80,120,130,55,65,45,76,'Rock','Ground',null],['Rapidash',65,100,70,80,80,105,78,'Fire',null,null],
  ['Slowbro',95,75,110,100,80,30,80,'Water','Psychic',null],['Magneton',50,60,95,120,70,70,82,'Electric','Steel',462],
  ['Dodrio',60,110,70,60,60,100,85,'Normal','Flying',null],['Dewgong',90,70,80,70,95,70,87,'Water','Ice',null],
  ['Muk',105,105,75,65,100,50,89,'Poison',null,null],['Cloyster',50,95,180,85,45,70,91,'Water','Ice',null],
  ['Gastly',30,35,30,100,35,80,92,'Ghost','Poison',93],['Haunter',45,50,45,115,55,95,93,'Ghost','Poison',94],['Gengar',60,65,60,130,75,110,94,'Ghost','Poison',null],
  ['Onix',35,45,160,30,45,70,95,'Rock','Ground',208],['Hypno',85,73,70,73,115,67,97,'Psychic',null,null],
  ['Kingler',55,130,115,50,50,75,99,'Water',null,null],['Electrode',60,50,70,80,80,150,101,'Electric',null,null],
  ['Exeggutor',95,95,85,125,75,55,103,'Grass','Psychic',null],['Marowak',60,80,110,50,80,45,105,'Ground',null,null],
  ['Hitmonlee',50,120,53,35,110,87,106,'Fighting',null,null],['Hitmonchan',50,105,79,35,110,76,107,'Fighting',null,null],
  ['Weezing',65,90,120,85,70,60,110,'Poison',null,null],['Rhydon',105,130,120,45,45,40,112,'Ground','Rock',464],
  ['Chansey',250,5,5,35,105,50,113,'Normal',null,242],['Tangela',65,55,115,100,40,60,114,'Grass',null,465],
  ['Kangaskhan',105,95,80,40,80,90,115,'Normal',null,null],['Seadra',55,65,95,95,45,85,117,'Water',null,230],
  ['Starmie',60,75,85,100,85,115,121,'Water','Psychic',null],['Mr. Mime',40,45,65,100,120,90,122,'Psychic','Fairy',null],
  ['Scyther',70,110,80,55,80,105,123,'Bug','Flying',212],['Jynx',65,50,35,115,95,95,124,'Ice','Psychic',null],
  ['Electabuzz',65,83,57,95,85,105,125,'Electric',null,466],['Magmar',65,95,57,100,85,93,126,'Fire',null,467],
  ['Pinsir',65,125,100,55,70,85,127,'Bug',null,null],['Tauros',75,100,95,40,70,110,128,'Normal',null,null],
  ['Gyarados',95,125,79,60,100,81,130,'Water','Flying',null],['Lapras',130,85,80,85,95,60,131,'Water','Ice',null],
  ['Eevee',55,55,50,45,65,55,133,'Normal',null,134],['Vaporeon',130,65,60,110,95,65,134,'Water',null,null],
  ['Jolteon',65,65,60,110,95,130,135,'Electric',null,null],['Flareon',65,130,60,95,110,65,136,'Fire',null,null],
  ['Porygon',65,60,70,85,75,40,137,'Normal',null,233],['Omastar',70,60,125,115,70,55,139,'Rock','Water',null],
  ['Kabutops',60,115,105,65,70,80,141,'Rock','Water',null],['Aerodactyl',80,105,65,60,75,130,142,'Rock','Flying',null],
  ['Snorlax',160,110,65,65,110,30,143,'Normal',null,null],
  ['Articuno',90,85,100,95,125,85,144,'Ice','Flying',null],['Zapdos',90,90,85,125,90,100,145,'Electric','Flying',null],['Moltres',90,100,90,125,85,90,146,'Fire','Flying',null],
  ['Dratini',41,64,45,50,50,50,147,'Dragon',null,148],['Dragonair',61,84,65,70,70,70,148,'Dragon',null,149],['Dragonite',91,134,95,100,100,80,149,'Dragon','Flying',null],
  ['Mewtwo',106,110,90,154,90,130,150,'Psychic',null,null],['Mew',100,100,100,100,100,100,151,'Psychic',null,null],
  ['Chikorita',45,49,65,49,65,45,152,'Grass',null,153],['Bayleef',60,62,80,63,80,60,153,'Grass',null,154],['Meganium',80,82,100,83,100,80,154,'Grass',null,null],
  ['Cyndaquil',39,52,43,60,50,65,155,'Fire',null,156],['Quilava',58,64,58,80,65,80,156,'Fire',null,157],['Typhlosion',78,84,78,109,85,100,157,'Fire',null,null],
  ['Totodile',50,65,64,44,48,43,158,'Water',null,159],['Croconaw',65,80,80,59,63,58,159,'Water',null,160],['Feraligatr',85,105,100,79,83,78,160,'Water',null,null],
  ['Furret',85,76,64,45,55,90,162,'Normal',null,null],['Noctowl',100,50,50,86,96,70,164,'Normal','Flying',null],
  ['Crobat',85,90,80,70,80,130,169,'Poison','Flying',null],['Lanturn',125,58,58,76,76,67,171,'Water','Electric',null],
  ['Pichu',20,40,15,35,35,60,172,'Electric',null,25],['Togetic',55,40,85,80,105,40,176,'Fairy','Flying',468],
  ['Ampharos',90,75,85,115,90,55,181,'Electric',null,null],['Bellossom',75,80,95,90,100,50,182,'Grass',null,null],
  ['Azumarill',100,50,80,60,80,50,184,'Water','Fairy',null],['Sudowoodo',70,100,115,30,65,30,185,'Rock',null,null],
  ['Politoed',90,75,75,90,100,70,186,'Water',null,null],['Jumpluff',75,55,70,55,95,110,189,'Grass','Flying',null],
  ['Espeon',65,65,60,130,95,110,196,'Psychic',null,null],['Umbreon',95,65,110,60,130,65,197,'Dark',null,null],
  ['Slowking',95,75,80,100,110,30,199,'Water','Psychic',null],['Misdreavus',60,60,60,85,85,85,200,'Ghost',null,429],
  ['Girafarig',70,80,65,90,65,85,203,'Normal','Psychic',null],['Forretress',75,90,140,60,60,40,205,'Bug','Steel',null],
  ['Steelix',75,85,200,55,65,30,208,'Steel','Ground',null],['Scizor',70,130,100,55,80,65,212,'Bug','Steel',null],
  ['Heracross',80,125,75,40,95,85,214,'Bug','Fighting',null],['Sneasel',55,95,55,35,75,115,215,'Dark','Ice',461],
  ['Ursaring',90,130,75,75,75,55,217,'Normal',null,null],['Piloswine',100,100,80,60,60,50,221,'Ice','Ground',473],
  ['Skarmory',65,80,140,40,70,70,227,'Steel','Flying',null],['Houndoom',75,90,50,110,80,95,229,'Dark','Fire',null],
  ['Kingdra',75,95,95,95,95,85,230,'Water','Dragon',null],['Donphan',90,120,120,60,60,50,232,'Ground',null,null],
  ['Porygon2',85,80,90,105,95,60,233,'Normal',null,474],['Hitmontop',50,95,95,35,110,70,237,'Fighting',null,null],
  ['Blissey',255,10,10,75,135,55,242,'Normal',null,null],
  ['Raikou',90,85,75,115,100,115,243,'Electric',null,null],['Entei',115,115,85,90,75,100,244,'Fire',null,null],['Suicune',100,75,115,90,115,85,245,'Water',null,null],
  ['Larvitar',50,64,50,45,50,41,246,'Rock','Ground',247],['Pupitar',70,84,70,65,70,51,247,'Rock','Ground',248],['Tyranitar',100,134,110,95,100,61,248,'Rock','Dark',null],
  ['Lugia',106,90,130,90,154,110,249,'Psychic','Flying',null],['Ho-Oh',106,130,90,110,154,90,250,'Fire','Flying',null],['Celebi',100,100,100,100,100,100,251,'Psychic','Grass',null],
  ['Treecko',40,45,35,65,55,70,252,'Grass',null,253],['Grovyle',50,65,45,85,65,95,253,'Grass',null,254],['Sceptile',70,85,65,105,85,120,254,'Grass',null,null],
  ['Torchic',45,60,40,70,50,45,255,'Fire',null,256],['Combusken',60,85,60,85,60,55,256,'Fire','Fighting',257],['Blaziken',80,120,70,110,70,80,257,'Fire','Fighting',null],
  ['Mudkip',50,70,50,50,50,40,258,'Water',null,259],['Marshtomp',70,85,70,60,70,50,259,'Water','Ground',260],['Swampert',100,110,90,85,90,60,260,'Water','Ground',null],
  ['Gardevoir',68,65,65,125,115,80,282,'Psychic','Fairy',null],['Breloom',60,130,80,60,60,70,286,'Grass','Fighting',null],
  ['Slaking',150,160,100,95,65,100,289,'Normal',null,null],['Hariyama',144,120,60,40,60,50,297,'Fighting',null,null],
  ['Aggron',70,110,180,60,60,50,306,'Steel','Rock',null],['Manectric',70,75,60,105,60,105,310,'Electric',null,null],
  ['Roselia',50,60,45,100,80,65,315,'Grass','Poison',407],['Sharpedo',70,120,40,95,40,95,319,'Water','Dark',null],
  ['Wailord',170,90,45,90,45,60,321,'Water',null,null],['Flygon',80,100,80,80,80,100,330,'Ground','Dragon',null],
  ['Altaria',75,70,90,70,105,80,334,'Dragon','Flying',null],['Zangoose',73,115,60,60,60,90,335,'Normal',null,null],
  ['Absol',65,130,60,75,60,75,359,'Dark',null,null],['Glalie',80,80,80,80,80,80,362,'Ice',null,null],
  ['Walrein',110,80,90,95,90,65,365,'Ice','Water',null],['Salamence',95,135,80,110,80,100,373,'Dragon','Flying',null],
  ['Metagross',80,135,130,95,90,70,376,'Steel','Psychic',null],
  ['Regirock',80,100,200,50,100,50,377,'Rock',null,null],['Regice',80,50,100,100,200,50,378,'Ice',null,null],['Registeel',80,75,150,75,150,50,379,'Steel',null,null],
  ['Latias',80,80,90,110,130,110,380,'Dragon','Psychic',null],['Latios',80,90,80,130,110,110,381,'Dragon','Psychic',null],
  ['Kyogre',100,100,90,150,140,90,382,'Water',null,null],['Groudon',100,150,140,100,90,90,383,'Ground',null,null],['Rayquaza',105,150,90,150,90,95,384,'Dragon','Flying',null],
  ['Jirachi',100,100,100,100,100,100,385,'Steel','Psychic',null],['Deoxys',50,150,50,150,50,150,386,'Psychic',null,null],
  ['Torterra',95,109,105,75,85,56,389,'Grass','Ground',null],['Infernape',76,104,71,104,71,108,392,'Fire','Fighting',null],
  ['Empoleon',84,86,88,111,101,60,395,'Water','Steel',null],['Staraptor',85,120,70,50,60,100,398,'Normal','Flying',null],
  ['Luxray',80,120,79,95,79,70,405,'Electric',null,null],['Roserade',60,70,65,125,105,90,407,'Grass','Poison',null],
  ['Rampardos',97,165,60,65,50,58,409,'Rock',null,null],['Bastiodon',60,52,168,47,138,30,411,'Rock','Steel',null],
  ['Floatzel',85,105,55,85,50,115,419,'Water',null,null],['Gastrodon',111,83,68,92,82,39,423,'Water','Ground',null],
  ['Drifblim',150,80,44,90,54,80,426,'Ghost','Flying',null],['Mismagius',60,60,60,105,105,105,429,'Ghost',null,null],
  ['Honchkrow',100,125,52,105,52,71,430,'Dark','Flying',null],['Spiritomb',50,92,108,92,108,35,442,'Ghost','Dark',null],
  ['Garchomp',108,130,95,80,85,102,445,'Dragon','Ground',null],['Lucario',70,110,70,115,70,90,448,'Fighting','Steel',null],
  ['Hippowdon',108,112,118,68,72,47,450,'Ground',null,null],['Drapion',70,90,110,60,75,95,452,'Poison','Dark',null],
  ['Toxicroak',83,106,65,86,65,85,454,'Poison','Fighting',null],['Abomasnow',90,92,75,92,85,60,460,'Grass','Ice',null],
  ['Weavile',70,120,65,45,85,125,461,'Dark','Ice',null],['Magnezone',70,70,115,130,90,60,462,'Electric','Steel',null],
  ['Rhyperior',115,140,130,55,55,40,464,'Ground','Rock',null],['Tangrowth',100,100,125,110,50,50,465,'Grass',null,null],
  ['Electivire',75,123,67,95,85,95,466,'Electric',null,null],['Magmortar',75,95,67,125,95,83,467,'Fire',null,null],
  ['Togekiss',85,50,95,120,115,80,468,'Fairy','Flying',null],['Leafeon',65,110,130,60,65,95,470,'Grass',null,null],
  ['Glaceon',65,60,110,130,95,65,471,'Ice',null,null],['Gliscor',75,95,125,45,75,95,472,'Ground','Flying',null],
  ['Mamoswine',110,130,80,70,60,80,473,'Ice','Ground',null],['Porygon-Z',85,80,70,135,75,90,474,'Normal',null,null],
  ['Gallade',68,125,65,65,115,80,475,'Psychic','Fighting',null],['Dusknoir',45,100,135,65,135,45,477,'Ghost',null,null],
  ['Froslass',70,80,70,80,70,110,478,'Ice','Ghost',null],['Rotom',50,50,77,95,77,91,479,'Electric','Ghost',null],
  ['Uxie',75,75,130,75,130,95,480,'Psychic',null,null],['Mesprit',80,105,105,105,105,80,481,'Psychic',null,null],['Azelf',75,125,70,125,70,115,482,'Psychic',null,null],
  ['Dialga',100,120,120,150,100,90,483,'Steel','Dragon',null],['Palkia',90,120,100,150,120,100,484,'Water','Dragon',null],
  ['Heatran',91,90,106,130,106,77,485,'Fire','Steel',null],['Giratina',150,100,120,100,120,90,487,'Ghost','Dragon',null],
  ['Cresselia',120,70,120,75,130,85,488,'Psychic',null,null],['Darkrai',70,90,90,135,90,125,491,'Dark',null,null],
  ['Arceus',120,120,120,120,120,120,493,'Normal',null,null],
];

// Deduplicated by dex number
const RAW_UNIQUE = (() => {
  const seen = new Set();
  return RAW.filter(e => { if (seen.has(e[7])) return false; seen.add(e[7]); return true; });
})();

const DEX_MAP = {};
RAW.forEach(e => { DEX_MAP[e[7]] = e; });

function dexToGen(dex) {
  if (dex <= 151) return 0; if (dex <= 251) return 1;
  if (dex <= 386) return 2; return 3;
}

const TIER_WEIGHTS = [15,20,35,20,10];
const TIER_LABELS  = ['E','D','C','B','S'];
const TIER_NAMES   = ['Common','Uncommon','Standard','Rare','Legendary'];
const TIER_COLORS  = ['#5a4a7a','#3a7a4a','#2a5a9a','#7a3a9a','#9a5a1a'];
const TYPE_BG = {
  Normal:'#6b6b5a',Fire:'#a04020',Water:'#1a4a8a',Electric:'#8a7a00',Grass:'#1a6a2a',
  Ice:'#2a6a7a',Fighting:'#7a1a1a',Poison:'#5a1a7a',Ground:'#6a4a1a',Flying:'#3a3a8a',
  Psychic:'#8a1a5a',Bug:'#4a6a1a',Rock:'#6a5a1a',Ghost:'#3a1a5a',Dragon:'#2a1a8a',
  Dark:'#2a1a2a',Steel:'#3a3a5a',Fairy:'#7a3a6a',
};

const POOL = (() => {
  const bsts = RAW_UNIQUE.map(e => e[1]+e[2]+e[3]+e[4]+e[5]+e[6]);
  const mn = Math.min(...bsts), mx = Math.max(...bsts), step = (mx-mn)/5;
  return RAW_UNIQUE.map((e,i) => ({
    name:e[0], dex:e[7], type1:e[8], type2:e[9],
    types:[e[8],e[9]].filter(Boolean),
    bst:bsts[i],
    tier:Math.min(4,Math.floor((bsts[i]-mn)/step)),
    gen:dexToGen(e[7]),
    evolvesTo:e[10]!=null?e[10]:null,
    isLegendary:LEGENDARY_DEX.has(e[7]),
  }));
})();

// Map dex -> pool entry for Pokédex display
const POOL_BY_DEX = {};
POOL.forEach(p => { POOL_BY_DEX[p.dex] = p; });

// ── MISSINGNO — the .01% glitch encounter ─────────────────────
const MISSINGNO_ODDS = 0.0001; // 0.01%
const MISSINGNO = {
  name:'MissingNo.', dex:0, type1:'Bird', type2:'Normal', types:['Bird','Normal'],
  bst:680, baseBst:680, tier:4, gen:0, evolvesTo:null,
  isLegendary:false, isShiny:false, isMissingNo:true,
};

function rollTier() {
  const r = Math.random()*100; let c = 0;
  for (let t=0;t<5;t++) { c+=TIER_WEIGHTS[t]; if(r<c) return t; } return 2;
}

function drawPoke(excludeNames, fixedTier, excludeGen, excludeTypes, excludeTier) {
  const base = POOL.filter(p => {
    if (excludeNames.has(p.name)) return false;
    if (excludeGen!=null && p.gen===excludeGen) return false;
    if (excludeTypes!=null && p.types.some(t=>excludeTypes.includes(t))) return false;
    return true;
  });
  let tier;
  if (fixedTier!=null) { tier=fixedTier; }
  else {
    const avail = [0,1,2,3,4].filter(t=>t!==excludeTier&&base.some(p=>p.tier===t));
    if (!avail.length) return base[Math.floor(Math.random()*base.length)]||null;
    const ws=avail.map(t=>TIER_WEIGHTS[t]), total=ws.reduce((s,w)=>s+w,0);
    let r=Math.random()*total, chosen=avail[avail.length-1];
    for(let i=0;i<avail.length;i++){r-=ws[i];if(r<=0){chosen=avail[i];break;}}
    tier=chosen;
  }
  const cands=base.filter(p=>p.tier===tier);
  const pool=cands.length?cands:base;
  if(!pool.length) return null;
  return pool[Math.floor(Math.random()*pool.length)];
}

function makePoke(p) {
  // .01% chance the catch glitches into MissingNo, ignoring the drawn Pokémon.
  if (Math.random() < MISSINGNO_ODDS) return { ...MISSINGNO };
  const isShiny = Math.random()<0.01;
  const bst = isShiny ? Math.round(p.bst*1.2) : p.bst;
  return { name:p.name, dex:p.dex, types:p.types, bst, baseBst:p.bst,
    tier:p.tier, gen:p.gen, evolvesTo:p.evolvesTo!=null?p.evolvesTo:null,
    isLegendary:p.isLegendary, isShiny };
}

// Eevee (#133) can branch into any of its evolutions, so the player picks.
const EEVEE_DEX = 133;
const EEVEELUTIONS = [134,135,136,196,197,470,471]; // Vaporeon..Glaceon

// Build an evolution object for a given target dex, inheriting shiny state.
function buildEvo(dexNum, from) {
  const e = DEX_MAP[dexNum]; if (!e) return null;
  const baseBst = e[1]+e[2]+e[3]+e[4]+e[5]+e[6];
  const bst = from.isShiny ? Math.round(baseBst*1.2) : baseBst;
  const poolEvo = POOL.find(p=>p.dex===dexNum);
  return { name:e[0], dex:e[7], types:[e[8],e[9]].filter(Boolean),
    bst, baseBst, tier:poolEvo?poolEvo.tier:from.tier, gen:dexToGen(e[7]),
    evolvesTo:e[10]!=null?e[10]:null, isLegendary:LEGENDARY_DEX.has(e[7]), isShiny:from.isShiny };
}

function getEvolution(poke) {
  if (!poke.evolvesTo) return null;
  return buildEvo(poke.evolvesTo, poke);
}

// Returns the list of choosable evolutions for a Pokémon (Eevee branches).
function getEvolutionChoices(poke) {
  if (poke.dex === EEVEE_DEX) {
    return EEVEELUTIONS.map(d => buildEvo(d, poke)).filter(Boolean);
  }
  const evo = getEvolution(poke);
  return evo ? [evo] : [];
}

function simulateRun(team) {
  const teamTypes = team.map(p=>p.types);
  const totalBST = team.reduce((s,p)=>s+p.bst,0);
  for(let i=0;i<BATTLES.length;i++){
    const mult=getBestMult(teamTypes,BATTLES[i].type);
    if(Math.round(totalBST*Math.max(0.5,mult))<=BATTLES[i].threshold) return i;
  }
  return -1;
}

// ── STORAGE ───────────────────────────────────────────────────
const EMPTY_STATS = {
  bestRun:0, totalWins:0, legendariesCaught:0, shiniesCaught:0,
  totalRuns:0, bestRunNoReroll:0, shinyChampion:0, metMissingNo:0,
  achievements:[], pokedex:[], seen:[],
};

function safeStats(raw) {
  // Recover data from any legacy nested `.stats` wrapper, then keep only
  // known keys so junk (username, stats) never re-propagates into saves.
  let src = raw || {};
  const seenUnion = new Set();
  const dexUnion = [];
  const dexKeys = new Set();
  const achUnion = new Set();
  let node = src;
  let depth = 0;
  const nums = { bestRun:0, totalWins:0, legendariesCaught:0, shiniesCaught:0, totalRuns:0, bestRunNoReroll:0, shinyChampion:0, metMissingNo:0 };
  while (node && typeof node === 'object' && depth < 10) {
    if (Array.isArray(node.seen)) node.seen.forEach(d => seenUnion.add(d));
    if (Array.isArray(node.achievements)) node.achievements.forEach(a => achUnion.add(a));
    if (Array.isArray(node.pokedex)) node.pokedex.forEach(p => {
      const k = p && (p.keptAt ?? `${p.dex}-${p.name}`);
      if (k != null && !dexKeys.has(k)) { dexKeys.add(k); dexUnion.push(p); }
    });
    for (const key of Object.keys(nums)) {
      if (typeof node[key] === 'number') nums[key] = Math.max(nums[key], node[key]);
    }
    node = node.stats; depth++;
  }
  return {
    ...nums,
    achievements: Array.from(achUnion),
    pokedex: dexUnion,
    seen: Array.from(seenUnion).sort((a,b)=>a-b),
  };
}

async function readStats(u) {
  if (!u) return { ...EMPTY_STATS };
  try {
    const r = await getStats();
    return r ? safeStats(r.stats) : { ...EMPTY_STATS };
  } catch { return { ...EMPTY_STATS }; }
}

async function writeStats(u, s) {
  if (!u) return;
  try { await saveStats(safeStats(s)); } catch(e) { console.error(e); }
}

// ── COMPONENTS ────────────────────────────────────────────────
function TierBadge({ tier }) {
  return <span style={{ background:TIER_COLORS[tier], fontSize:'9px', border:`1px solid ${GB.accent}`, color:GB.lightest, fontWeight:'bold', display:'inline-block', padding:'1px 5px' }}>{TIER_LABELS[tier]}</span>;
}

function PokeCard({ poke, size }) {
  const sz = size||64;
  if (!poke) return <div style={{ width:sz, height:sz, background:GB.darkest, border:`1px solid ${GB.mid}` }}/>;
  const bg = TYPE_BG[poke.types[0]]||GB.dark;
  const fs = sz<50?9:sz<70?11:13;
  return (
    <div style={{ width:sz, height:sz, background:bg, border:`2px solid ${poke.isShiny?GB.shiny:GB.mid}`,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      position:'relative', overflow:'hidden', flexShrink:0, boxShadow:poke.isShiny?`0 0 8px ${GB.shiny}`:'none' }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.08) 3px,rgba(0,0,0,0.08) 4px),repeating-linear-gradient(90deg,transparent,transparent 3px,rgba(0,0,0,0.08) 3px,rgba(0,0,0,0.08) 4px)' }}/>
      {poke.isShiny && <div style={{ position:'absolute', top:2, right:3, fontSize:sz<50?8:10 }}>✨</div>}
      <div style={{ color:'rgba(255,255,255,0.15)', fontSize:sz*0.55, fontWeight:'bold', lineHeight:1, userSelect:'none', textTransform:'uppercase', letterSpacing:-2 }}>{poke.name[0]}</div>
      <div style={{ color:GB.lightest, fontSize:fs, fontWeight:'bold', textTransform:'uppercase', textAlign:'center', padding:'0 2px', lineHeight:1.1, maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textShadow:'0 1px 2px rgba(0,0,0,0.8)' }}>
        {poke.name.length>8&&sz<70?poke.name.slice(0,7)+'.':poke.name}
      </div>
      <div style={{ color:'rgba(255,255,255,0.5)', fontSize:sz<50?7:8, marginTop:1 }}>#{String(poke.dex).padStart(3,'0')}</div>
    </div>
  );
}

function Roulette({ finalPoke, onDone }) {
  const [displayName, setDisplayName] = useState('???');
  const [displayPoke, setDisplayPoke] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const frameRef = useRef(null);
  const countRef = useRef(0);
  useEffect(() => {
    function tick() {
      countRef.current++;
      if (countRef.current >= 24) {
        setDisplayName(finalPoke.name.toUpperCase());
        setDisplayPoke(finalPoke);
        setRevealed(true);
        setTimeout(() => onDone(), 700);
        return;
      }
      const rnd = POOL[Math.floor(Math.random()*POOL.length)];
      setDisplayName(rnd.name.toUpperCase());
      setDisplayPoke({ ...rnd, isShiny:false });
      const p = countRef.current/24;
      frameRef.current = setTimeout(tick, p<0.5?55:p<0.8?100:p<0.95?170:260);
    }
    frameRef.current = setTimeout(tick, 55);
    return () => clearTimeout(frameRef.current);
  }, []);
  return (
    <div style={{ textAlign:'center', padding:'16px 0' }}>
      <div style={{ display:'inline-block', border:`3px solid ${revealed?GB.accent:GB.mid}`, transition:'border-color 0.3s' }}>
        <PokeCard poke={displayPoke} size={96}/>
      </div>
      <div style={{ color:revealed?GB.accent:GB.textDim, fontSize:revealed?12:10, fontWeight:'bold', letterSpacing:2, marginTop:8, minHeight:18 }}>{displayName}</div>
      {revealed&&finalPoke.isShiny&&<div style={{ color:GB.shiny, fontSize:11, fontWeight:'bold', marginTop:4 }}>✨ SHINY POKÉMON! ✨</div>}
      {!revealed&&<div style={{ color:GB.dim, fontSize:9, marginTop:2 }}>searching...</div>}
    </div>
  );
}

function EvoAnimation({ from, to, onDone }) {
  const [phase, setPhase] = useState(0);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    const t1=setTimeout(()=>setPhase(1),600), t2=setTimeout(()=>setFlash(true),700),
          t3=setTimeout(()=>setFlash(false),900), t4=setTimeout(()=>setFlash(true),1000),
          t5=setTimeout(()=>setFlash(false),1150), t6=setTimeout(()=>setPhase(2),1300),
          t7=setTimeout(()=>onDone(),2100);
    return () => [t1,t2,t3,t4,t5,t6,t7].forEach(clearTimeout);
  }, []);
  return (
    <div style={{ textAlign:'center', padding:'12px 0' }}>
      <div style={{ color:GB.accent, fontSize:11, letterSpacing:2, marginBottom:8 }}>EVOLVING!</div>
      <div style={{ display:'inline-block', border:`3px solid ${GB.accent}`, background:flash?GB.lightest:'transparent', transition:'background 0.1s' }}>
        <PokeCard poke={phase<2?from:to} size={88}/>
      </div>
      <div style={{ color:GB.lightest, fontSize:11, fontWeight:'bold', marginTop:6 }}>{phase<2?from.name:`${from.name} → ${to.name}`}</div>
    </div>
  );
}

function AchievementToast({ achievements, onDismiss }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => { if(idx<achievements.length-1) setIdx(i=>i+1); else onDismiss(); }, 3200);
    return () => clearTimeout(t);
  }, [idx]);
  const a = achievements[idx];
  if (!a) return null;
  return (
    <div style={{ position:'fixed', top:20, left:'50%', transform:'translateX(-50%)', zIndex:1000,
      background:GB.dark, border:`2px solid ${GB.win}`, padding:'12px 20px', minWidth:280, maxWidth:360,
      boxShadow:'0 0 20px rgba(240,192,64,0.4)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ fontSize:28, flexShrink:0 }}>{a.icon}</div>
        <div>
          <div style={{ color:GB.win, fontSize:10, fontWeight:'bold', letterSpacing:1, marginBottom:2 }}>ACHIEVEMENT UNLOCKED</div>
          <div style={{ color:GB.lightest, fontSize:13, fontWeight:'bold' }}>{a.title}</div>
          <div style={{ color:GB.textDim, fontSize:10, marginTop:2 }}>{a.desc}</div>
        </div>
      </div>
      {achievements.length>1&&<div style={{ color:GB.dim, fontSize:9, textAlign:'right', marginTop:6 }}>{idx+1}/{achievements.length}</div>}
    </div>
  );
}

const sWrap    = { minHeight:'100vh', background:GB.darkest, display:'flex', alignItems:'center', justifyContent:'center', padding:16, fontFamily:'monospace' };
const sCard    = { width:'100%', maxWidth:420, background:GB.dark, border:`3px solid ${GB.border}`, borderRadius:4, padding:20 };
const sH1      = { color:GB.accent, fontSize:22, fontWeight:'bold', textAlign:'center', letterSpacing:3, marginBottom:4 };
const sBtn     = { width:'100%', background:GB.mid, color:GB.lightest, border:`2px solid ${GB.accent}`, padding:'10px 0', fontWeight:'bold', fontSize:14, cursor:'pointer', letterSpacing:1 };
const sBtnSm   = { background:GB.mid, color:GB.lightest, border:`2px solid ${GB.accent}`, padding:'6px 8px', fontWeight:'bold', fontSize:11, cursor:'pointer', letterSpacing:1 };
const sBtnDead = { background:GB.darkest, color:GB.dim, border:`2px solid ${GB.dim}`, padding:'6px 8px', fontWeight:'bold', fontSize:11, cursor:'not-allowed', letterSpacing:1 };
const sInput   = { width:'100%', background:GB.darkest, color:GB.text, border:`2px solid ${GB.accent}`, padding:'8px 10px', fontFamily:'monospace', fontSize:13, outline:'none', boxSizing:'border-box' };
const sTab     = { padding:'6px 0', fontFamily:'monospace', fontWeight:'bold', fontSize:10, cursor:'pointer', border:`1px solid ${GB.mid}`, flex:1, textAlign:'center' };

// ── MISSINGNO GLITCH OVERLAY ──────────────────────────────────
function GlitchCard({ onContinue, onReset }) {
  const [bars, setBars] = useState([]);
  useEffect(() => {
    // Inject keyframes once.
    if (!document.getElementById('mno-glitch-style')) {
      const el = document.createElement('style');
      el.id = 'mno-glitch-style';
      el.textContent = `
        @keyframes mnoShake { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-3px,2px)} 40%{transform:translate(3px,-2px)} 60%{transform:translate(-2px,-1px)} 80%{transform:translate(2px,1px)} }
        @keyframes mnoFlicker { 0%,100%{opacity:1} 47%{opacity:1} 48%{opacity:0.3} 49%{opacity:1} 72%{opacity:1} 73%{opacity:0.5} 74%{opacity:1} }
        @keyframes mnoScan { 0%{background-position:0 0} 100%{background-position:0 16px} }`;
      document.head.appendChild(el);
    }
    const id = setInterval(() => {
      const n = 6 + Math.floor(Math.random()*6);
      setBars(Array.from({length:n}).map(() => ({
        top:Math.random()*100, h:1+Math.random()*5, left:Math.random()*40, w:30+Math.random()*60,
        c:['#e8d8f8','#c9a0f0','#6b4fa0','#1a1c2c'][Math.floor(Math.random()*4)],
      })));
    }, 90);
    return () => clearInterval(id);
  }, []);
  const glyphs = '▚▞█▓▒░╳¿?ǝℳᴎⵘ◣◥';
  return (
    <div style={{ background:GB.darkest, border:`2px solid ${GB.lose}`, padding:12, marginBottom:8,
      position:'relative', overflow:'hidden', animation:'mnoShake 0.18s infinite' }}>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:3,
        backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 6px,rgba(0,0,0,0.35) 7px,rgba(0,0,0,0.35) 8px)',
        animation:'mnoScan 0.4s linear infinite' }}/>
      {bars.map((b,i)=>(
        <div key={i} style={{ position:'absolute', top:`${b.top}%`, left:`${b.left}%`, width:`${b.w}%`, height:b.h,
          background:b.c, opacity:0.7, zIndex:2, mixBlendMode:'screen' }}/>
      ))}
      <div style={{ position:'relative', zIndex:4, textAlign:'center' }}>
        <div style={{ color:GB.lose, fontSize:11, fontWeight:'bold', letterSpacing:2, marginBottom:8, animation:'mnoFlicker 0.6s infinite' }}>
          ⚠ DATA CORRUPTED ⚠
        </div>
        <div style={{ display:'inline-block', position:'relative', animation:'mnoFlicker 0.5s infinite' }}>
          <div style={{ width:96, height:96, margin:'0 auto', background:'#2a1a3a', border:`2px solid ${GB.lose}`,
            display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative',
            backgroundImage:'repeating-linear-gradient(90deg,#1a1c2c 0,#1a1c2c 3px,#3a2f5e 3px,#3a2f5e 4px,#6b4fa0 4px,#6b4fa0 6px)' }}>
            <span style={{ position:'absolute', fontSize:34, color:GB.lightest, fontWeight:'bold', textShadow:`2px 0 ${GB.lose}, -2px 0 ${GB.mid}`, fontFamily:'monospace' }}>
              {glyphs.slice(0,4)}
            </span>
          </div>
        </div>
        <div style={{ color:GB.lightest, fontSize:14, fontWeight:'bold', marginTop:8, letterSpacing:1,
          textShadow:`2px 0 ${GB.lose}, -2px 0 ${GB.accent}`, fontFamily:'monospace' }}>
          MissingNo.
        </div>
        <div style={{ color:GB.textDim, fontSize:9, marginTop:4 }}>#000 · BIRD/NORMAL · BST ¿680?</div>
        <div style={{ color:GB.lose, fontSize:9, marginTop:6, fontFamily:'monospace' }}>
          {'01001101 ¿?¿ 0xDEADBEEF ¿? 9̸9̷9̴'}
        </div>
        <div style={{ color:GB.textDim, fontSize:10, marginTop:10, lineHeight:1.5 }}>
          A glitch tore through your roulette. Keep it on your team, or reset the encounter?
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:10 }}>
          <button style={{...sBtnSm, background:GB.lose, color:GB.lightest, borderColor:GB.lightest}} onClick={onContinue}>KEEP GLITCH ▚</button>
          <button style={sBtnSm} onClick={onReset}>RESET ↻</button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────
export default function App() {
  const [authScreen, setAuthScreen]   = useState('splash');
  const [username, setUsername]       = useState('');
  const [inputName, setInputName]     = useState('');
  const [inputEmail, setInputEmail]   = useState('');
  const [inputPass, setInputPass]     = useState('');
  const [authError, setAuthError]     = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [stats, setStats]             = useState({ ...EMPTY_STATS });
  const [accountTab, setAccountTab]   = useState('stats');
  const [pokedexGen, setPokedexGen]   = useState(0);
  const [confirmRelease, setConfirmRelease] = useState(null);
  const [musicOn, setMusicOn]         = useState(false);
  const chiptuneRef = useRef(null);

  // Lazily create the engine and toggle playback. Off by default; the first
  // toggle is the user gesture that unlocks the Web Audio context. We flip the
  // UI state immediately and let the (async) context resume happen in the
  // background so the button never appears stuck.
  function toggleMusic() {
    try {
      if (!chiptuneRef.current) chiptuneRef.current = new Chiptune();
      if (chiptuneRef.current.isPlaying) {
        chiptuneRef.current.stop();
        setMusicOn(false);
      } else {
        chiptuneRef.current.start();
        setMusicOn(true);
      }
    } catch (e) {
      console.error('[v0] music toggle failed', e);
      setMusicOn(false);
    }
  }

  // Stop audio if the component unmounts.
  useEffect(() => () => { chiptuneRef.current?.stop(); }, []);

  const [screen, setScreen]           = useState('home');
  const [rollNum, setRollNum]         = useState(0);
  const [spinning, setSpinning]       = useState(false);
  const [nextPoke, setNextPoke]       = useState(null);
  const [current, setCurrent]         = useState(null);
  const [team, setTeam]               = useState([]);
  const [excluded, setExcluded]       = useState(new Set());
  const [usedType, setUsedType]       = useState(false);
  const [usedGen, setUsedGen]         = useState(false);
  const [usedRare, setUsedRare]       = useState(false);
  const [usedEvo, setUsedEvo]         = useState(false);
  const [rerollsUsed, setRerollsUsed] = useState(0);
  const [evoPhase, setEvoPhase]       = useState(null);
  const [result, setResult]           = useState(null);
  const [copied, setCopied]           = useState(false);
  const [toast, setToast]             = useState([]);
  const [keepModal, setKeepModal]     = useState(false);
  const [hasCaught, setHasCaught]     = useState(false);
  const [glitch, setGlitch]           = useState(false);

  // username ref so async callbacks always see latest value
  const userRef = useRef('');
  useEffect(() => { userRef.current = username; }, [username]);

  // Restore an existing Better Auth session on mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await authClient.getSession();
        if (!active) return;
        if (data?.user) {
          const name = data.user.name || data.user.email;
          setUsername(name); userRef.current = name;
          const s = await readStats(name);
          if (active) { setStats(s); setAuthScreen('game'); }
        }
      } catch (e) { console.error(e); }
    })();
    return () => { active = false; };
  }, []);

  // ── Auth ──────────────────────────────────────────────────
  async function handleRegister() {
    const name = inputName.trim();
    const email = inputEmail.trim();
    if (!name||name.length<2) { setAuthError('Username must be at least 2 characters.'); return; }
    if (!email||!email.includes('@')) { setAuthError('Enter a valid email.'); return; }
    if (!inputPass||inputPass.length<8) { setAuthError('Password must be at least 8 characters.'); return; }
    setAuthLoading(true);
    const { error } = await authClient.signUp.email({ email, password:inputPass, name });
    if (error) { setAuthError(error.message || 'Could not create account.'); setAuthLoading(false); return; }
    setUsername(name); userRef.current = name;
    const s = await readStats(name);
    setStats(s);
    setInputName(''); setInputEmail(''); setInputPass(''); setAuthError('');
    setAuthLoading(false); setAuthScreen('game');
  }

  async function handleLogin() {
    const email = inputEmail.trim();
    if (!email) { setAuthError('Enter your email.'); return; }
    if (!inputPass) { setAuthError('Enter your password.'); return; }
    setAuthLoading(true);
    const { data, error } = await authClient.signIn.email({ email, password:inputPass });
    if (error) { setAuthError(error.message || 'Login failed.'); setAuthLoading(false); return; }
    const name = data?.user?.name || email;
    setUsername(name); userRef.current = name;
    const s = await readStats(name);
    setStats(s);
    setInputName(''); setInputEmail(''); setInputPass(''); setAuthError('');
    setAuthLoading(false); setAuthScreen('game');
  }

  async function handleLogout() {
    try { await authClient.signOut(); } catch(e) { console.error(e); }
    setUsername(''); userRef.current = '';
    setStats({ ...EMPTY_STATS });
    setAuthScreen('splash'); setScreen('home');
  }

  // ── Core stat writer — always reads fresh, merges, writes ──
  async function applyStatUpdate(updater) {
    const u = userRef.current;
    const current = await readStats(u);
    const next = safeStats(updater(current));
    await writeStats(u, next);
    setStats(next);
    return next;
  }

  // ── Game ──────────────────────────────────────────────────
  function startGame() {
    const ex = new Set();
    const first = drawPoke(ex, null, null, null, null);
    ex.add(first.name);
    setTeam([]); setExcluded(ex); setCurrent(null);
    setNextPoke(makePoke(first)); setRollNum(0);
    setUsedType(false); setUsedGen(false); setUsedRare(false); setUsedEvo(false);
    setRerollsUsed(0); setEvoPhase(null); setResult(null);
    setHasCaught(false); setGlitch(false); setSpinning(true); setScreen('draft');
  }

  function onRouletteDone() {
    const drawn = nextPoke;
    setSpinning(false); setCurrent(drawn); setNextPoke(null);
    if (drawn?.isMissingNo) { setGlitch(true); recordMissingNo(); }
  }

  // Record the glitch encounter: bump the counter, unlock the achievement,
  // and add MissingNo (dex 0) to the seen set so it shows in the Pokédex.
  async function recordMissingNo() {
    await applyStatUpdate(base => {
      const seenSet = new Set(base.seen); seenSet.add(0);
      const newS = {
        ...base,
        metMissingNo: (base.metMissingNo||0) + 1,
        seen: Array.from(seenSet).sort((a,b)=>a-b),
      };
      const newAch = getNewAchievements(base, newS);
      newS.achievements = [...base.achievements, ...newAch.map(a=>a.id)];
      if (newAch.length) setTimeout(()=>setToast(prev=>[...prev,...newAch]),1800);
      return newS;
    });
  }

  // Keep the glitch on your team — MissingNo is a chaotic 680 BST powerhouse.
  function continueGlitch() { setGlitch(false); }

  // Reject the glitch — re-roll this slot back to a normal Pokémon.
  function resetGlitch() {
    setGlitch(false);
    let pick = drawPoke(excluded, null, null, null, null);
    let poke = pick ? makePoke(pick) : null;
    // Guard against the (astronomically rare) back-to-back glitch.
    if (poke?.isMissingNo && pick) poke = { ...pick, baseBst:pick.bst, isShiny:false };
    if (!poke) return;
    setExcluded(new Set([...excluded, poke.name]));
    setNextPoke(poke); setCurrent(null); setSpinning(true);
  }

  function queueNext(newTeam, newEx) {
    if (newTeam.length === 6) {
      const defeated = simulateRun(newTeam);
      setResult({ defeated, team:newTeam });
      // Save stats async — all 6 pokemon seen
      applyStatUpdate(base => {
        const seenSet = new Set(base.seen);
        newTeam.forEach(p => { if (p?.dex) seenSet.add(p.dex); });
        const isWin = defeated === -1;
        const badgesWon = isWin ? 12 : defeated;
        const newS = {
          ...base,
          bestRun: Math.max(base.bestRun, badgesWon),
          totalWins: base.totalWins + (isWin?1:0),
          legendariesCaught: base.legendariesCaught + newTeam.filter(p=>p.isLegendary).length,
          shiniesCaught: base.shiniesCaught + newTeam.filter(p=>p.isShiny).length,
          totalRuns: base.totalRuns + 1,
          bestRunNoReroll: rerollsUsed===0 ? Math.max(base.bestRunNoReroll,badgesWon) : base.bestRunNoReroll,
          shinyChampion: base.shinyChampion + (isWin&&newTeam.some(p=>p.isShiny)?1:0),
          seen: Array.from(seenSet).sort((a,b)=>a-b),
        };
        const newAch = getNewAchievements(base, newS);
        newS.achievements = [...base.achievements, ...newAch.map(a=>a.id)];
        if (newAch.length) setTimeout(() => setToast(newAch), 400);
        return newS;
      });
      setScreen('result');
      return;
    }
    const pick = drawPoke(newEx, null, null, null, null);
    if (!pick) return;
    const poke = makePoke(pick);
    newEx.add(poke.name);
    setExcluded(new Set(newEx));
    setNextPoke(poke); setCurrent(null); setSpinning(true);
  }

  function keep() {
    if (!current) return;
    const newTeam = [...team, current];
    const newEx = new Set([...excluded, current.name]);
    setTeam(newTeam); setExcluded(newEx);
    const choices = !usedEvo ? getEvolutionChoices(current) : [];
    if (choices.length) {
      // Default to the first option; Eevee shows a multi-way picker.
      setEvoPhase({ offer:true, poke:current, evo:choices[0], choices, newTeam, newEx });
    } else {
      setRollNum(r=>r+1); queueNext(newTeam, newEx);
    }
  }

  // Accept the (optionally chosen) evolution and kick off the animation.
  function acceptEvo(chosen) {
    setEvoPhase(p=>({ ...p, evo:chosen||p.evo, offer:false, animating:true }));
  }

  function skipEvo() {
    const { newTeam, newEx } = evoPhase;
    setEvoPhase(null); setRollNum(r=>r+1); queueNext(newTeam, newEx);
  }

  function onEvoDone() {
    const { evo, newTeam, newEx } = evoPhase;
    const updated = [...newTeam]; updated[updated.length-1] = evo;
    setTeam(updated); setUsedEvo(true); setEvoPhase(null);
    setRollNum(r=>r+1); queueNext(updated, newEx);
  }

  function doReroll(fixedTier, excludeGen, excludeTypes, excludeTier, setUsed) {
    if (!current) return;
    const pick = drawPoke(excluded, fixedTier, excludeGen, excludeTypes, excludeTier);
    if (!pick) return;
    const poke = makePoke(pick);
    setExcluded(new Set([...excluded, poke.name]));
    setNextPoke(poke); setCurrent(null); setSpinning(true);
    setUsed(true); setRerollsUsed(r=>r+1);
  }

  async function catchPokemon(poke) {
    if (hasCaught) return;
    await applyStatUpdate(base => {
      if (base.pokedex.length >= 100) return base;
      const entry = { ...poke, keptAt:Date.now() };
      const newPokedex = [...base.pokedex, entry];
      const newS = { ...base, pokedex:newPokedex };
      const newAch = getNewAchievements(base, newS);
      newS.achievements = [...base.achievements, ...newAch.map(a=>a.id)];
      if (newAch.length) setTimeout(()=>setToast(prev=>[...prev,...newAch]),400);
      return newS;
    });
    setHasCaught(true);
    setKeepModal(false);
  }

  async function releasePokemon(idx) {
    await applyStatUpdate(base => {
      const newPokedex = base.pokedex.filter((_,i)=>i!==idx);
      return { ...base, pokedex:newPokedex };
    });
    setConfirmRelease(null);
  }

  function share() {
    if (!result) return;
    const wins = result.defeated===-1?12:result.defeated;
    const label = result.defeated===-1?'Champion!':`Stopped at ${BATTLES[result.defeated].name}`;
    const teamStr = result.team.map(p=>`${p.name}${p.isShiny?'✨':''}${p.isLegendary?'★':''}`).join(' · ');
    navigator.clipboard.writeText(`Elite Four: ${wins}/12 — ${label}\n${teamStr}`).catch(()=>{});
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  }

  // ── SPLASH ────────────────────────────────────────────────
  const musicToggle = (
    <button
      onClick={toggleMusic}
      aria-label={musicOn ? 'Mute music' : 'Play music'}
      title={musicOn ? 'Mute music' : 'Play 8-bit music'}
      style={{
        position:'fixed', top:12, right:12, zIndex:50,
        width:40, height:40, cursor:'pointer',
        background:musicOn?GB.win:GB.darkest, color:musicOn?GB.darkest:GB.textDim,
        border:`2px solid ${musicOn?GB.win:GB.mid}`, borderRadius:0,
        fontSize:16, lineHeight:1, fontFamily:'monospace', fontWeight:'bold',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'2px 2px 0 rgba(0,0,0,0.4)',
      }}
    >
      {musicOn ? '♪' : '🔇'}
    </button>
  );

  if (authScreen==='splash') return (
    <div style={sWrap}>
      {musicToggle}
      <div style={sCard}>
        <div style={sH1}>ELITE FOUR</div>
        <div style={{ color:GB.textDim, fontSize:11, textAlign:'center', marginBottom:24 }}>Catch 6 Pokémon · Beat all 12 leaders</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button style={sBtn} onClick={()=>setAuthScreen('login')}>LOG IN</button>
          <button style={{...sBtn, background:GB.darkest}} onClick={()=>setAuthScreen('register')}>CREATE ACCOUNT</button>
          <button style={{...sBtnSm, width:'100%', textAlign:'center', marginTop:4}}
            onClick={()=>{ setUsername(''); userRef.current=''; setStats({...EMPTY_STATS}); setAuthScreen('game'); }}>
            PLAY AS GUEST
          </button>
        </div>
      </div>
    </div>
  );

  // ── AUTH ──────────────────────────────────────────────────
  if (authScreen==='login'||authScreen==='register') {
    const isReg = authScreen==='register';
    return (
      <div style={sWrap}>
        {musicToggle}
        <div style={sCard}>
          <div style={sH1}>ELITE FOUR</div>
          <div style={{ color:GB.accent, fontSize:13, fontWeight:'bold', textAlign:'center', marginBottom:16 }}>{isReg?'CREATE ACCOUNT':'LOG IN'}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {isReg && (
              <div>
                <div style={{ color:GB.textDim, fontSize:10, marginBottom:4 }}>USERNAME</div>
                <input style={sInput} value={inputName} onChange={e=>setInputName(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&(isReg?handleRegister():handleLogin())} placeholder="trainer name"/>
              </div>
            )}
            <div>
              <div style={{ color:GB.textDim, fontSize:10, marginBottom:4 }}>EMAIL</div>
              <input style={sInput} type="email" value={inputEmail} onChange={e=>setInputEmail(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&(isReg?handleRegister():handleLogin())} placeholder="trainer@email.com"/>
            </div>
            <div>
              <div style={{ color:GB.textDim, fontSize:10, marginBottom:4 }}>PASSWORD</div>
              <input style={sInput} type="password" value={inputPass} onChange={e=>setInputPass(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&(isReg?handleRegister():handleLogin())} placeholder="password"/>
            </div>
            {authError&&<div style={{ color:GB.lose, fontSize:11 }}>{authError}</div>}
            <button style={sBtn} onClick={isReg?handleRegister:handleLogin} disabled={authLoading}>
              {authLoading?'LOADING...':isReg?'CREATE ACCOUNT':'LOG IN'}
            </button>
            <button style={sBtnSm} onClick={()=>{ setAuthError(''); setAuthScreen('splash'); }}>← BACK</button>
          </div>
        </div>
      </div>
    );
  }

  // ── HOME ──────────────────────────────────────────────────
  if (authScreen==='game' && screen==='home') return (
    <div style={sWrap}>
      {musicToggle}
      {toast.length>0&&<AchievementToast achievements={toast} onDismiss={()=>setToast([])}/>}
      <div style={sCard}>
        <div style={sH1}>ELITE FOUR</div>
        {username ? (
          <div style={{ background:GB.darkest, border:`1px solid ${GB.mid}`, padding:10, marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <span style={{ color:GB.accent, fontSize:12, fontWeight:'bold' }}>👤 {username.toUpperCase()}</span>
              <button style={{...sBtnSm, padding:'2px 8px', fontSize:10}}
                onClick={handleLogout}>LOG OUT</button>
            </div>
            {/* Tabs */}
            <div style={{ display:'flex', gap:3, marginBottom:8 }}>
              {['stats','pc','pokedex','badges'].map(t=>(
                <button key={t} style={{...sTab,
                  background:accountTab===t?GB.mid:GB.darkest,
                  color:accountTab===t?GB.lightest:GB.textDim,
                  borderColor:accountTab===t?GB.accent:GB.mid,
                  fontSize:9,
                }} onClick={()=>setAccountTab(t)}>
                  {t==='stats'?'STATS':t==='pc'?`${username.slice(0,6).toUpperCase()}'S PC`:t==='pokedex'?'POKÉDEX':'BADGES'}
                </button>
              ))}
            </div>

            {/* STATS */}
            {accountTab==='stats'&&(
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {[
                  ['Best Run',`${stats.bestRun}/12`],['Champion Wins',stats.totalWins],
                  ['Total Runs',stats.totalRuns||0],['Win Rate',stats.totalRuns?`${Math.round(stats.totalWins/stats.totalRuns*100)}%`:'0%'],
                  ['Legendaries ★',stats.legendariesCaught],['Shinies ✨',stats.shiniesCaught],
                  ['Pokémon Seen',(stats.seen||[]).length],['PC Storage',`${(stats.pokedex||[]).length}/100`],
                ].map(([label,val])=>(
                  <div key={label} style={{ background:GB.dark, border:`1px solid ${GB.dim}`, padding:'6px 8px' }}>
                    <div style={{ color:GB.textDim, fontSize:9 }}>{label}</div>
                    <div style={{ color:GB.lightest, fontSize:16, fontWeight:'bold' }}>{val}</div>
                  </div>
                ))}
              </div>
            )}

            {/* PC */}
            {accountTab==='pc'&&(
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <span style={{ color:GB.textDim, fontSize:9 }}>{(stats.pokedex||[]).length}/100 Pokémon</span>
                  {confirmRelease!==null&&(
                    <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                      <span style={{ color:GB.lose, fontSize:9 }}>Release {(stats.pokedex||[])[confirmRelease]?.name}?</span>
                      <button style={{...sBtnSm, padding:'1px 6px', fontSize:9, borderColor:GB.lose, color:GB.lose}} onClick={()=>releasePokemon(confirmRelease)}>YES</button>
                      <button style={{...sBtnSm, padding:'1px 6px', fontSize:9}} onClick={()=>setConfirmRelease(null)}>NO</button>
                    </div>
                  )}
                </div>
                {(stats.pokedex||[]).length===0 ? (
                  <div style={{ color:GB.dim, fontSize:11, textAlign:'center', padding:'12px 0' }}>
                    No Pokémon in PC yet. Catch one after each run!
                  </div>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:4, maxHeight:200, overflowY:'auto' }}>
                    {[...(stats.pokedex||[])].reverse().map((p,i)=>{
                      const realIdx = (stats.pokedex||[]).length-1-i;
                      const isConfirming = confirmRelease===realIdx;
                      return (
                        <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, cursor:'pointer', position:'relative' }}
                          onClick={()=>setConfirmRelease(isConfirming?null:realIdx)}>
                          <div style={{ opacity:isConfirming?0.5:1 }}><PokeCard poke={p} size={52}/></div>
                          {isConfirming&&(
                            <div style={{ position:'absolute', top:0, left:0, right:0, bottom:16, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.6)' }}>
                              <span style={{ color:GB.lose, fontSize:8, fontWeight:'bold' }}>RELEASE?</span>
                            </div>
                          )}
                          <div style={{ fontSize:7, color:p.isShiny?GB.shiny:GB.textDim, textAlign:'center', maxWidth:52, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {p.isShiny?'✨ ':''}{p.name}
                          </div>
                          {p.isLegendary&&<div style={{ fontSize:7, color:GB.win }}>★</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* POKÉDEX — all seen, sorted by dex, tabbed by gen */}
            {accountTab==='pokedex'&&(()=>{
              const seenSet = new Set(stats.seen||[]);
              const genPool = POOL
                .filter(p=>{ const r=GEN_RANGES[pokedexGen]; return p.dex>=r.min&&p.dex<=r.max; })
                .sort((a,b)=>a.dex-b.dex);
              // MissingNo (dex 0) lives at the head of the Gen I tab once encountered.
              if (pokedexGen===0 && seenSet.has(0)) genPool.unshift(MISSINGNO);
              const seenInGen = genPool.filter(p=>seenSet.has(p.dex));
              return (
                <div>
                  <div style={{ display:'flex', gap:3, marginBottom:6 }}>
                    {GEN_LABELS.map((g,i)=>(
                      <button key={i} style={{ flex:1, padding:'3px 0', fontFamily:'monospace', fontSize:9, fontWeight:'bold', cursor:'pointer',
                        background:pokedexGen===i?GB.mid:GB.darkest, color:pokedexGen===i?GB.lightest:GB.textDim,
                        border:`1px solid ${pokedexGen===i?GB.accent:GB.mid}` }} onClick={()=>setPokedexGen(i)}>{g}</button>
                    ))}
                  </div>
                  <div style={{ color:GB.textDim, fontSize:9, textAlign:'right', marginBottom:4 }}>
                    {seenInGen.length}/{genPool.length} seen
                    {seenInGen.length===genPool.length&&genPool.length>0&&<span style={{ color:GB.win, marginLeft:6 }}>★ COMPLETE</span>}
                  </div>
                  {seenInGen.length===0 ? (
                    <div style={{ color:GB.dim, fontSize:10, textAlign:'center', padding:'12px 0' }}>No Pokémon seen in {GEN_LABELS[pokedexGen]} yet.</div>
                  ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:3, maxHeight:180, overflowY:'auto' }}>
                      {genPool.map(p=>{
                        const seen = seenSet.has(p.dex);
                        const isMno = p.isMissingNo;
                        return (
                          <div key={p.dex} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
                            <div style={{ width:44, height:44,
                              background:isMno&&seen?'#2a1a3a':seen?(TYPE_BG[p.types[0]]||GB.dark):GB.darkest,
                              border:`2px solid ${isMno&&seen?GB.lose:seen?GB.mid:'#2a2a3a'}`, display:'flex', flexDirection:'column',
                              alignItems:'center', justifyContent:'center', overflow:'hidden',
                              backgroundImage:isMno&&seen?'repeating-linear-gradient(90deg,#1a1c2c 0,#1a1c2c 2px,#3a2f5e 2px,#3a2f5e 3px,#6b4fa0 3px,#6b4fa0 5px)':'none',
                              filter:seen?'none':'brightness(0.25)' }}>
                              <div style={{ color:isMno&&seen?GB.lightest:'rgba(255,255,255,0.2)', fontSize:isMno&&seen?16:22, fontWeight:'bold', lineHeight:1, textTransform:'uppercase', textShadow:isMno&&seen?`1px 0 ${GB.lose},-1px 0 ${GB.accent}`:'none' }}>{seen?(isMno?'▚?':p.name[0]):'?'}</div>
                              {seen&&<div style={{ color:'rgba(255,255,255,0.5)', fontSize:6 }}>#{String(p.dex).padStart(3,'0')}</div>}
                            </div>
                            <div style={{ fontSize:6, color:isMno&&seen?GB.lose:seen?GB.textDim:'#2a2a3a', textAlign:'center', maxWidth:44, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {seen?p.name:'???'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* BADGES */}
            {accountTab==='badges'&&(
              <div style={{ maxHeight:200, overflowY:'auto' }}>
                {ALL_ACHIEVEMENTS.map(a=>{
                  const unlocked=(stats.achievements||[]).includes(a.id);
                  return (
                    <div key={a.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderBottom:`1px solid ${GB.darkest}`, opacity:unlocked?1:0.35 }}>
                      <span style={{ fontSize:18, flexShrink:0 }}>{unlocked?a.icon:'🔒'}</span>
                      <div>
                        <div style={{ color:unlocked?GB.win:GB.dim, fontSize:10, fontWeight:'bold' }}>{a.title}</div>
                        <div style={{ color:GB.textDim, fontSize:9 }}>{a.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div style={{ color:GB.textDim, fontSize:11, textAlign:'center', marginBottom:12 }}>
            Playing as Guest —{' '}
            <span style={{ color:GB.accent, cursor:'pointer', textDecoration:'underline' }} onClick={()=>setAuthScreen('splash')}>log in to save stats</span>
          </div>
        )}
        <div style={{ background:GB.darkest, border:`1px solid ${GB.mid}`, padding:10, marginBottom:12 }}>
          <div style={{ color:GB.accent, fontSize:10, fontWeight:'bold', marginBottom:6 }}>POWER-UPS — one use each</div>
          {[['↻ TYPE','keep rarity, swap type'],['↻ GEN','keep rarity, swap generation'],['↻ RARITY','full re-roll'],['★ EVOLVE','evolve one Pokémon after catching'],['✨ SHINY','1% chance — +20% BST boost']].map(([k,v])=>(
            <div key={k} style={{ display:'flex', gap:8, marginBottom:3 }}>
              <span style={{ color:GB.accent, fontSize:10, minWidth:64 }}>{k}</span>
              <span style={{ color:GB.textDim, fontSize:10 }}>{v}</span>
            </div>
          ))}
        </div>
        <button style={sBtn} onClick={startGame}>START YOUR JOURNEY →</button>
      </div>
    </div>
  );

  // ── DRAFT ─────────────────────────────────────────────────
  if (authScreen==='game' && screen==='draft') {
    const rerolls = [
      { label:'↻ TYPE',   used:usedType, fn:()=>doReroll(current?.tier,null,current?.types,null,setUsedType) },
      { label:'↻ GEN',    used:usedGen,  fn:()=>doReroll(current?.tier,current?.gen,null,null,setUsedGen) },
      { label:'↻ RARITY', used:usedRare, fn:()=>doReroll(null,null,null,current?.tier,setUsedRare) },
    ];
    return (
      <div style={sWrap}>
        {musicToggle}
        {toast.length>0&&<AchievementToast achievements={toast} onDismiss={()=>setToast([])}/>}
        <div style={sCard}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <button style={{...sBtnSm, padding:'4px 8px'}} onClick={()=>setScreen('home')}>← BACK</button>
            <span style={{ color:GB.accent, fontSize:13, fontWeight:'bold' }}>CATCH {rollNum+1} / 6</span>
            <span style={{ width:60 }}/>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:4, marginBottom:12 }}>
            {Array.from({length:6}).map((_,i)=>{
              const p=team[i];
              return (
                <div key={i} style={{ border:`2px solid ${p?GB.accent:i===rollNum?GB.light:GB.mid}`,
                  background:GB.darkest, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                  {p ? <PokeCard poke={p} size={52}/> : <span style={{ color:i===rollNum?GB.light:GB.dim, fontSize:16, lineHeight:'52px' }}>{i===rollNum?'▶':'?'}</span>}
                </div>
              );
            })}
          </div>

          {evoPhase&&evoPhase.offer&&(
            <div style={{ background:GB.darkest, border:`2px solid ${GB.accent}`, padding:12, textAlign:'center', marginBottom:8 }}>
              <div style={{ color:GB.accent, fontSize:11, fontWeight:'bold', marginBottom:8 }}>★ EVOLVE AVAILABLE</div>
              {evoPhase.choices&&evoPhase.choices.length>1 ? (
                <>
                  <div style={{ color:GB.text, fontSize:10, marginBottom:8 }}>Choose {evoPhase.poke.name}&apos;s evolution:</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:10 }}>
                    {evoPhase.choices.map(c=>(
                      <button key={c.dex} onClick={()=>acceptEvo(c)}
                        style={{ background:GB.dark, border:`2px solid ${GB.mid}`, padding:'4px 2px', cursor:'pointer',
                          display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                        <PokeCard poke={c} size={52}/>
                        <div style={{ color:GB.lightest, fontSize:8, fontWeight:'bold' }}>{c.name}</div>
                        <div style={{ color:GB.accent, fontSize:8 }}>+{c.bst-evoPhase.poke.bst}</div>
                      </button>
                    ))}
                  </div>
                  <button style={sBtnSm} onClick={skipEvo}>SKIP →</button>
                </>
              ) : (
                <>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginBottom:8 }}>
                    <div style={{ textAlign:'center' }}><PokeCard poke={evoPhase.poke} size={64}/><div style={{ color:GB.textDim, fontSize:9, marginTop:2 }}>{evoPhase.poke.name}</div></div>
                    <span style={{ color:GB.accent, fontSize:18 }}>→</span>
                    <div style={{ textAlign:'center' }}><PokeCard poke={evoPhase.evo} size={64}/><div style={{ color:GB.text, fontSize:9, fontWeight:'bold', marginTop:2 }}>{evoPhase.evo.name}</div></div>
                  </div>
                  <div style={{ color:GB.accent, fontSize:10, marginBottom:8 }}>BST +{evoPhase.evo.bst-evoPhase.poke.bst}</div>
                  <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
                    <button style={{...sBtnSm, background:GB.accent, color:GB.darkest}} onClick={()=>acceptEvo()}>EVOLVE ★</button>
                    <button style={sBtnSm} onClick={skipEvo}>SKIP →</button>
                  </div>
                </>
              )}
            </div>
          )}

          {evoPhase&&evoPhase.animating&&<EvoAnimation from={evoPhase.poke} to={evoPhase.evo} onDone={onEvoDone}/>}
          {spinning&&nextPoke&&!evoPhase&&<Roulette finalPoke={nextPoke} onDone={onRouletteDone}/>}

          {glitch&&current?.isMissingNo&&!spinning&&!evoPhase&&(
            <GlitchCard onContinue={continueGlitch} onReset={resetGlitch}/>
          )}

          {current&&!spinning&&!evoPhase&&!glitch&&(
            <div style={{ background:GB.darkest, border:`2px solid ${current.isShiny?GB.shiny:GB.border}`, padding:12, boxShadow:current.isShiny?`0 0 12px ${GB.shiny}`:undefined }}>
              <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:8, flexWrap:'wrap' }}>
                <span style={{ background:TIER_COLORS[current.tier], color:GB.lightest, fontSize:9, fontWeight:'bold', padding:'2px 6px', border:`1px solid ${GB.accent}` }}>{TIER_LABELS[current.tier]}</span>
                <span style={{ color:GB.textDim, fontSize:10 }}>{TIER_NAMES[current.tier]}</span>
                <span style={{ color:GB.dim, fontSize:10 }}>·</span>
                <span style={{ color:GB.accent, fontSize:10, fontWeight:'bold' }}>{GEN_LABELS[current.gen]}</span>
                {current.isShiny&&<span style={{ color:GB.shiny, fontSize:10, fontWeight:'bold' }}>✨ SHINY!</span>}
                {current.isLegendary&&<span style={{ color:GB.win, fontSize:10, fontWeight:'bold' }}>★ LEGENDARY</span>}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:10 }}>
                <PokeCard poke={current} size={88}/>
                <div>
                  <div style={{ color:current.isShiny?GB.shiny:GB.text, fontWeight:'bold', fontSize:14, textTransform:'uppercase', marginBottom:4 }}>{current.name}</div>
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:4 }}>
                    {current.types.map(t=><span key={t} style={{ background:GB.mid, color:GB.lightest, fontSize:9, padding:'2px 5px', border:`1px solid ${GB.dim}` }}>{t}</span>)}
                  </div>
                  {current.dex===EEVEE_DEX&&!usedEvo&&<div style={{ color:GB.dim, fontSize:9, marginTop:2 }}>→ choose evolution</div>}
                  {current.dex!==EEVEE_DEX&&current.evolvesTo&&DEX_MAP[current.evolvesTo]&&!usedEvo&&<div style={{ color:GB.dim, fontSize:9, marginTop:2 }}>→ {DEX_MAP[current.evolvesTo][0]}</div>}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:8 }}>
                {rerolls.map(r=>(
                  <button key={r.label} onClick={r.fn} disabled={r.used} style={r.used?sBtnDead:sBtnSm}>
                    {r.used?r.label.replace('↻','✗'):r.label}
                  </button>
                ))}
              </div>
              <button style={sBtn} onClick={keep}>{rollNum===5?'CATCH & SIMULATE →':`CATCH ${current.name.toUpperCase()} →`}</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── RESULT ────────────────────────────────────────────────
  if (authScreen==='game' && screen==='result' && result) {
    const isChamp = result.defeated===-1;
    const badgesWon = isChamp?12:result.defeated;
    return (
      <div style={sWrap}>
        {musicToggle}
        {toast.length>0&&<AchievementToast achievements={toast} onDismiss={()=>setToast([])}/>}

        {keepModal&&(
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:900, padding:16 }}>
            <div style={{...sCard, maxWidth:360}}>
              <div style={{ color:GB.accent, fontSize:14, fontWeight:'bold', textAlign:'center', marginBottom:4 }}>CATCH A POKÉMON</div>
              <div style={{ color:GB.textDim, fontSize:10, textAlign:'center', marginBottom:12 }}>Choose one to add to {username.toUpperCase()}'S PC</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
                {result.team.map((p,i)=>(
                  <button key={i} onClick={()=>catchPokemon(p)} style={{ background:GB.darkest, border:`2px solid ${p.isShiny?GB.shiny:GB.mid}`, padding:6, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:4, boxShadow:p.isShiny?`0 0 8px ${GB.shiny}`:undefined }}>
                    <PokeCard poke={p} size={60}/>
                    <div style={{ color:p.isShiny?GB.shiny:GB.text, fontSize:9, fontWeight:'bold', textAlign:'center' }}>{p.isShiny?'✨ ':''}{p.name}</div>
                    {p.isLegendary&&<div style={{ color:GB.win, fontSize:8 }}>★ Legend</div>}
                    <TierBadge tier={p.tier}/>
                  </button>
                ))}
              </div>
              <button style={sBtnSm} onClick={()=>setKeepModal(false)}>SKIP →</button>
            </div>
          </div>
        )}

        <div style={sCard}>
          <div style={{ color:GB.accent, fontSize:16, fontWeight:'bold', textAlign:'center', letterSpacing:2, marginBottom:12 }}>RUN RESULTS</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:4, marginBottom:8 }}>
            {result.team.map(p=>(
              <div key={p.name} style={{ border:`1px solid ${p.isShiny?GB.shiny:GB.mid}`, display:'flex', flexDirection:'column', alignItems:'center', boxShadow:p.isShiny?`0 0 6px ${GB.shiny}`:undefined }}>
                <PokeCard poke={p} size={52}/>
                <span style={{ background:TIER_COLORS[p.tier], color:GB.lightest, fontSize:8, fontWeight:'bold', padding:'1px 4px', width:'100%', textAlign:'center' }}>{TIER_LABELS[p.tier]}</span>
              </div>
            ))}
          </div>
          <div style={{ color:GB.dim, fontSize:9, textAlign:'center', marginBottom:8 }}>
            {result.team.map(p=>`${p.name}${p.isShiny?'✨':''}${p.isLegendary?'★':''}`).join(' · ')}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:3, marginBottom:12 }}>
            {BATTLES.map((b,i)=>{
              const won=isChamp||i<badgesWon, isStop=!isChamp&&i===result.defeated;
              return (
                <div key={i} style={{ textAlign:'center', border:`1px solid ${isStop?GB.lose:won?GB.win:GB.mid}`, background:isStop?'#3a1a1a':won?'#1a2a1a':GB.darkest, padding:2 }}>
                  <img src={b.img} alt={b.name} style={{ width:'100%', height:28, objectFit:'cover', objectPosition:'top' }} onError={e=>{e.target.style.display='none';}}/>
                  <div style={{ fontSize:8, fontWeight:'bold', color:isStop?GB.lose:won?GB.win:GB.dim }}>{won&&!isStop?'✓':isStop?'✗':'—'}</div>
                  <div style={{ fontSize:7, color:GB.dim, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.name}</div>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign:'center', padding:16, border:`2px solid ${isChamp?GB.win:GB.border}`, background:GB.darkest, marginBottom:12 }}>
            {isChamp
              ? <div style={{ color:GB.win, fontSize:16, fontWeight:'bold', marginBottom:4 }}>★ CHAMPION ★</div>
              : <div style={{ color:GB.text, fontSize:13, fontWeight:'bold', marginBottom:4 }}>Stopped at {BATTLES[result.defeated].name}</div>}
            <div style={{ color:GB.lightest, fontSize:36, fontWeight:'bold', lineHeight:1 }}>{badgesWon}<span style={{ color:GB.textDim, fontSize:16 }}>/12</span></div>
            <div style={{ color:GB.textDim, fontSize:10, marginTop:4 }}>badges cleared</div>
          </div>

          {username&&(
            <div style={{ background:GB.darkest, border:`1px solid ${GB.mid}`, padding:8, marginBottom:10 }}>
              <div style={{ color:GB.textDim, fontSize:9, marginBottom:6 }}>YOUR STATS</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
                {[['Best Run',`${stats.bestRun}/12`],['Champion Wins',stats.totalWins],['Total Runs',stats.totalRuns||0],
                  ['Win Rate',stats.totalRuns?`${Math.round(stats.totalWins/stats.totalRuns*100)}%`:'0%'],
                  ['Pokémon Seen',(stats.seen||[]).length],['PC Storage',`${(stats.pokedex||[]).length}/100`]
                ].map(([label,val])=>(
                  <div key={label} style={{ background:GB.dark, border:`1px solid ${GB.dim}`, padding:'4px 8px' }}>
                    <div style={{ color:GB.textDim, fontSize:9 }}>{label}</div>
                    <div style={{ color:GB.lightest, fontSize:14, fontWeight:'bold' }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
            <button style={sBtnSm} onClick={share}>{copied?'COPIED!':'SHARE'}</button>
            {username&&(
              <button style={{...sBtnSm, borderColor:hasCaught?GB.dim:GB.win, color:hasCaught?GB.dim:GB.win, cursor:hasCaught?'not-allowed':'pointer'}}
                onClick={()=>{ if(!hasCaught) setKeepModal(true); }} disabled={hasCaught}>
                {hasCaught?'CAUGHT ✓':'CATCH ONE'}
              </button>
            )}
            <button style={{...sBtnSm, background:GB.accent, color:GB.darkest, border:`2px solid ${GB.lightest}`}} onClick={()=>setScreen('home')}>PLAY AGAIN</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
