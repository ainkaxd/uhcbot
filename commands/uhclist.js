const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uhclist')
    .setDescription('Обновляет embed со списком команд вручную'),

  async execute(interaction, client) {
    const guild = interaction.guild;
    const channel = await guild.channels.fetch(process.env.REGISTRATION_CHANNEL_ID);

    if (!client.registrationMessage) {
      return interaction.reply({
        content: '❌ Сообщение регистрации не найдено. Запусти команду `/uhc-start` сначала.',
        ephemeral: true
      });
    }

    let description = '';
    let index = 1;
    for (const [_, team] of client.teams.entries()) {
      description += `**${index}.** <@${team.leader}> + <@${team.teammate}> — **${team.name}**\n`;
      index++;
    }

    if (!description) description = 'Пока никто не зарегистрировался.';

    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    const embed = new EmbedBuilder()
      .setTitle('📋 Список команд')
      .setDescription(description)
      .setColor(0x00ae86);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('register').setLabel('Регистрация').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('edit').setLabel('Изменить состав').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('unregister').setLabel('Отменить участие').setStyle(ButtonStyle.Danger)
    );

    await client.registrationMessage.edit({ embeds: [embed], components: [row] });

    return interaction.reply({ content: '✅ Список команд обновлён.', ephemeral: true });
  }
};
