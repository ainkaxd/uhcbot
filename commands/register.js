const { SlashCommandBuilder } = require('discord.js');
const { updateTeamListMessage } = require('../core/ui');
const { readTeams, saveTeams } = require('../core/uhcStorage');

const registrationChannelId = process.env.REGISTRATION_CHANNEL_ID;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uhc-register')
    .setDescription('Регистрирует тебя и тиммейта в команду для Pako UHC')
    .addUserOption(option =>
      option.setName('teammate').setDescription('Выбери тиммейта').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('teamname').setDescription('Введите название команды').setRequired(true)
    ),

  async execute(interaction) {
    const leaderId = interaction.user.id;
    const teammate = interaction.options.getUser('teammate');
    const teamName = interaction.options.getString('teamname');

    if (!teammate || teammate.bot) {
      return interaction.reply({ content: '❌ Указан недопустимый тиммейт.', ephemeral: true });
    }

    const teams = readTeams();
    const alreadyRegistered = Object.values(teams).some(team =>
      team.leader === leaderId || team.teammate === leaderId ||
      team.leader === teammate.id || team.teammate === teammate.id
    );

    if (alreadyRegistered) {
      return interaction.reply({
        content: '❌ Ты или твой тиммейт уже зарегистрированы в другой команде.',
        ephemeral: true
      });
    }

    const teamId = `${leaderId}-${teammate.id}`;
    teams[teamId] = {
      name: teamName,
      leader: leaderId,
      teammate: teammate.id
    };

    saveTeams(teams);

    const channel = await interaction.guild.channels.fetch(registrationChannelId);
    await updateTeamListMessage(channel);

    return interaction.reply({
      content: `✅ Команда **${teamName}** зарегистрирована: <@${leaderId}> + <@${teammate.id}>`,
      ephemeral: true
    });
  }
};
