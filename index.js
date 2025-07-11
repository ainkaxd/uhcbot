require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.Channel],
});

client.commands = new Collection();
client.teams = new Map();
client.registrationMessage = null;
client.teamListMessage = null; // для /uhclist

// Автоматическая загрузка команд
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error('❌ Ошибка выполнения команды:', error);
      const reply = { content: '❌ Произошла ошибка.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  }

  if (interaction.isButton()) {
    const userId = interaction.user.id;

    if (interaction.customId === 'register') {
      const modal = new ModalBuilder()
        .setCustomId('register-modal')
        .setTitle('Регистрация команды')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('teammate')
              .setLabel('Discord тег тиммейта (например: user#0001)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('teamname')
              .setLabel('Название команды')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );
      return await interaction.showModal(modal);
    }

    if (interaction.customId === 'edit') {
      if (!client.teams.has(userId)) {
        return interaction.reply({ content: '❌ Ты не зарегистрирован.', ephemeral: true });
      }

      const { teammateTag, name } = client.teams.get(userId);

      const modal = new ModalBuilder()
        .setCustomId('edit-modal')
        .setTitle('Изменение состава')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('teammate')
              .setLabel('Новый тег тиммейта')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setValue(teammateTag)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('teamname')
              .setLabel('Новое имя команды')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setValue(name)
          )
        );

      return await interaction.showModal(modal);
    }

    if (interaction.customId === 'unregister') {
      if (!client.teams.has(userId)) {
        return interaction.reply({ content: '❌ Ты не зарегистрирован.', ephemeral: true });
      }

      client.teams.delete(userId);
      await updateTeamListMessage(client);
      return interaction.reply({ content: '✅ Ты успешно отменил регистрацию.', ephemeral: true });
    }
  }

  if (interaction.isModalSubmit()) {
    const userId = interaction.user.id;
    const guild = interaction.guild;
    const members = await guild.members.fetch();

    const teammateTag = interaction.fields.getTextInputValue('teammate');
    const teamName = interaction.fields.getTextInputValue('teamname');
    const teammate = members.find(u => u.user.tag === teammateTag);

    if (!teammate) {
      return interaction.reply({ content: '❌ Тиммейт не найден.', ephemeral: true });
    }

    const alreadyInTeam = [...client.teams.values()].some(team =>
      [team.leader, team.teammate].includes(userId) ||
      [team.leader, team.teammate].includes(teammate.id)
    );

    if (interaction.customId === 'register-modal') {
      if (alreadyInTeam) {
        return interaction.reply({ content: '❌ Кто-то из вас уже в команде.', ephemeral: true });
      }

      client.teams.set(userId, {
        name: teamName,
        leader: userId,
        teammate: teammate.id,
        teammateTag: teammateTag
      });

      await updateTeamListMessage(client);
      return interaction.reply({ content: `✅ Команда **${teamName}** зарегистрирована!`, ephemeral: true });
    }

    if (interaction.customId === 'edit-modal') {
      if (!client.teams.has(userId)) {
        return interaction.reply({ content: '❌ Ты не зарегистрирован.', ephemeral: true });
      }

      client.teams.set(userId, {
        name: teamName,
        leader: userId,
        teammate: teammate.id,
        teammateTag: teammateTag
      });

      await updateTeamListMessage(client);
      return interaction.reply({ content: `✅ Команда обновлена: **${teamName}**`, ephemeral: true });
    }
  }
});

async function updateTeamListMessage(client) {
  if (!client.teamListMessage) return; // обновляем только если сообщение уже создано

  let desc = '';
  let i = 1;
  for (const team of client.teams.values()) {
    desc += `**${i}.** <@${team.leader}> + <@${team.teammate}> — **${team.name}**\n`;
    i++;
  }
  if (!desc) desc = '_пока никто не зарегистрировался_';

  const embed = new EmbedBuilder()
    .setTitle('📋 Список команд')
    .setDescription(desc)
    .setColor(0x00ae86);

  await client.teamListMessage.edit({ embeds: [embed] });
}

client.login(process.env.TOKEN);