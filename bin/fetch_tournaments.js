import DOM from '@mojojs/dom';
import { readFileSync, writeFileSync } from 'fs';
import { exit } from 'process';
import {URL} from 'url';

const GOOGLE_API_KEY = 'AIzaSyDuB1Us94DGa1zPgzl7UHuWqXEVRuKmcGc';

const STATUSES = {
    'closednow': true,
    'closedpayonlynow': true,
    'opennow': true,
    'soon': true,
};

const html = readFileSync('./data/2022-04-28.html', { encoding: 'utf-8' });
const tournamentsFile = readFileSync('./data/tournaments.json', { encoding: 'utf-8' });
const list = JSON.parse(tournamentsFile);

const knownTournaments = {};
for (let t of list) {
    knownTournaments[t.tid] = t; 
}

// Parse
const dom = new DOM(html);

const tournaments = [];
const classNames = {};

dom.find('div.row').forEach(row => {
    const anchors = row.find('div.infocenter > h3 > a');

    if (anchors.length) {
        const anchor = anchors[0];

        const tourneyURL = new URL('https://pickleballtournaments.com/' + anchor.attr.href);
        const name = anchor.text();
        const datesText = row.find('p.tourney-date')[0].text().split(' - ');
        const statusEl = row.find('div.registration')[0];

        let status = '';

        statusEl.attr.class.split(' ').forEach(c => {
            if (classNames[c]) {
                classNames[c]++;
            } else {
                classNames[c] = 1;
            }

            if (STATUSES[c]) {
                status = c;
            }
        });

        const soonEl = statusEl.find('p.soon-date')[0];

        let soonDate = '';

        if (soonEl) {
            status = 'soon';
            soonDate = soonEl.text();
        }

        //console.log(statusEl.attr.class);
        const address = row.find('div.infocenter > h3 + p')[0].text();
        
        const tourney = {
            tid: tourneyURL.searchParams.get('tid'),
            url: tourneyURL.href,
            name: name,
            address,
            startDate: datesText[0].trim(),
            endDate: datesText[1].trim(),
            status,
            soonDate,
        };

        //console.log(tourney);
        tournaments.push(tourney);
    }
});

let count = 1;

for (let tournament of tournaments) {
    console.log(tournament);

    const seen = knownTournaments[tournament.tid];

    if (seen && seen.lat) {
        console.log('************* skipping', seen);
        continue;
    }

    const geoURL = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    geoURL.searchParams.append('address', tournament.address);
    geoURL.searchParams.append('key', GOOGLE_API_KEY);

    await fetch(geoURL.href)
        .then(res => res.json())
        .then(data => {
            //console.log(data.results[0]);
            const result = data.results[0];

            tournament.formattedAddress = result.formatted_address;
            tournament.googlePlaceId = result.place_id;
            tournament.lat = result.geometry.location.lat;
            tournament.lng = result.geometry.location.lng;

            //console.log(tournament);

        })
        .catch(console.error);
}

//console.log(tournaments);

writeFileSync('./data/tournaments.json', JSON.stringify(tournaments, null, 4));
