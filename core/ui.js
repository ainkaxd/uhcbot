const { EmbedBuilder } = require('discord.js');
const { readTeams } = require('./uhcStorage');

function generateTeamList() {
  const teams = readTeams();
  if (Object.keys(teams).length === 0) return '❌ Пока никто не зарегистрирован.';

  return Object.values(teams)
    .map((team, i) => `**${i + 1}. ${team.name}** — <@${team.leader}> + <@${team.teammate}>`)
    .join('\n\n');
}

async function updateTeamListMessage(channel) {
  const embed = new EmbedBuilder()
    .setTitle('🏆 Список команд на Pako UHC 2!')
    .setDescription(generateTeamList())
    .setColor(0x00ff88)
    .setFooter({ text: 'Информация обновляется автоматически' });

  const messages = await channel.messages.fetch({ limit: 100 });
  const existing = messages.find(msg =>
    msg.author.bot &&
    msg.embeds.length &&
    msg.embeds[0].title?.includes('Список команд')
  );

  if (existing) {
    await existing.edit({ embeds: [embed] });
  } else {
    await channel.send({ embeds: [embed] });
  }
}

module.exports = {
  updateTeamListMessage
};
