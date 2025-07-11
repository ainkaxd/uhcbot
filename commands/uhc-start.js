const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uhc-start')
    .setDescription('Запускает сообщение регистрации'),

  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle('📢 Pako UHC 2 — снова тут джиги!')
      .setDescription('🗓 **19 июля в 21:00**\n📌 Версия: 1.8.9\n🎤 Микрофон 18+\n:face_with_symbols_over_mouth: Запрещено материться\n\nНажмите кнопку ниже, чтобы зарегистрироваться!')
      .setColor(0xff5555);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('register').setLabel('Регистрация').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('edit').setLabel('Изменить состав').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('unregister').setLabel('Отменить участие').setStyle(ButtonStyle.Danger)
    );

    const sentMessage = await interaction.channel.send({ embeds: [embed], components: [row] });

    // Сохраняем сообщение в память клиента
    client.registrationMessage = sentMessage;

    await interaction.reply({ content: '✅ Сообщение регистрации запущено!', ephemeral: true });
  }
};
