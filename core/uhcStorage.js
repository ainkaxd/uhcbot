const fs = require('fs');
const path = require('path');

const teamsPath = path.join(__dirname, '../data/teams.json');
const statusPath = path.join(__dirname, '../data/status.json');

function readTeams() {
  try {
    return JSON.parse(fs.readFileSync(teamsPath, 'utf8'));
  } catch {
    return {};
  }
}

function saveTeams(teams) {
  fs.writeFileSync(teamsPath, JSON.stringify(teams, null, 2));
  writePlayerStatus(teams);
}

function writePlayerStatus(teams) {
  const registered = {};
  const raw = [];

  for (const teamId in teams) {
    const team = teams[teamId];
    registered[team.leader] = { team: team.name, role: 'leader' };
    registered[team.teammate] = { team: team.name, role: 'teammate' };
    raw.push(team.leader, team.teammate);
  }

  const result = { registered, raw };
  fs.writeFileSync(statusPath, JSON.stringify(result, null, 2));
}

module.exports = { readTeams, saveTeams };
