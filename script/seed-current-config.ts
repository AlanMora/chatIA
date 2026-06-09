import "dotenv/config";
import fs from "fs";
import path from "path";
import pg from "pg";

const seedPath = path.resolve(process.cwd(), "seed", "current-config.seed.json");

type SeedData = {
  users: any[];
  chatbots: any[];
  modelProviders: any[];
  modelCatalog: any[];
  chatbotModelSettings: any[];
  agentSkills: any[];
  agentTools: any[];
  chatbotSkills: any[];
  chatbotTools: any[];
};

function cleanUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as T;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no esta configurado.");
  }

  if (!fs.existsSync(seedPath)) {
    throw new Error(`No existe el archivo seed: ${seedPath}`);
  }

  const seed = JSON.parse(fs.readFileSync(seedPath, "utf8")) as SeedData;
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query("begin");

    for (const user of seed.users) {
      await client.query(
        `insert into users (id, email, first_name, last_name, profile_image_url)
         values ($1, $2, $3, $4, $5)
         on conflict (id) do update set
           email = excluded.email,
           first_name = excluded.first_name,
           last_name = excluded.last_name,
           profile_image_url = excluded.profile_image_url,
           updated_at = now()`,
        [user.id, user.email, user.firstName, user.lastName, user.profileImageUrl],
      );
    }

    for (const chatbot of seed.chatbots) {
      const safe = cleanUndefined({
        id: chatbot.id,
        user_id: chatbot.userId,
        name: chatbot.name,
        description: chatbot.description,
        system_prompt: chatbot.systemPrompt,
        ai_model: chatbot.aiModel,
        ai_provider: chatbot.aiProvider,
        custom_endpoint: chatbot.customEndpoint,
        custom_model_name: chatbot.customModelName,
        embedding_provider: chatbot.embeddingProvider,
        embedding_model: chatbot.embeddingModel,
        embedding_dimensions: chatbot.embeddingDimensions,
        embedding_base_url: chatbot.embeddingBaseUrl,
        primary_color: chatbot.primaryColor,
        text_color: chatbot.textColor,
        position: chatbot.position,
        welcome_message: chatbot.welcomeMessage,
        avatar_image: chatbot.avatarImage,
        temperature: chatbot.temperature,
        max_tokens: chatbot.maxTokens,
        is_active: chatbot.isActive,
        elevenlabs_agent_id: chatbot.elevenLabsAgentId,
        require_lead_capture: chatbot.requireLeadCapture,
        lead_capture_fields: chatbot.leadCaptureFields,
      });
      const columns = Object.keys(safe);
      const params = columns.map((_, index) => `$${index + 1}`).join(", ");
      const updates = columns.filter((column) => column !== "id").map((column) => `${column}=excluded.${column}`).join(", ");
      await client.query(
        `insert into chatbots (${columns.join(", ")}) values (${params})
         on conflict (id) do update set ${updates}`,
        Object.values(safe),
      );
    }

    await client.query("delete from model_providers");
    for (const provider of seed.modelProviders) {
      await client.query(
        `insert into model_providers (id, name, type, requires_api_key, supports_custom_base_url, is_active)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (id) do update set
           name=excluded.name,
           type=excluded.type,
           requires_api_key=excluded.requires_api_key,
           supports_custom_base_url=excluded.supports_custom_base_url,
           is_active=excluded.is_active`,
        [provider.id, provider.name, provider.type, provider.requiresApiKey, provider.supportsCustomBaseUrl, provider.isActive],
      );
    }

    await client.query("delete from model_catalog");
    for (const model of seed.modelCatalog) {
      await client.query(
        `insert into model_catalog (model_id, label, provider_id, type, dimensions, is_default, is_active, source, notes, refreshed_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [model.modelId, model.label, model.providerId, model.type, model.dimensions, model.isDefault, model.isActive, model.source, model.notes, model.refreshedAt],
      );
    }

    for (const settings of seed.chatbotModelSettings) {
      await client.query(
        `insert into chatbot_model_settings
          (chatbot_id, chat_provider, chat_model, embedding_provider, embedding_model, embedding_dimensions, embedding_base_url, temperature, max_tokens, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
         on conflict (chatbot_id) do update set
           chat_provider=excluded.chat_provider,
           chat_model=excluded.chat_model,
           embedding_provider=excluded.embedding_provider,
           embedding_model=excluded.embedding_model,
           embedding_dimensions=excluded.embedding_dimensions,
           embedding_base_url=excluded.embedding_base_url,
           temperature=excluded.temperature,
           max_tokens=excluded.max_tokens,
           updated_at=now()`,
        [
          settings.chatbotId,
          settings.chatProvider,
          settings.chatModel,
          settings.embeddingProvider,
          settings.embeddingModel,
          settings.embeddingDimensions,
          settings.embeddingBaseUrl,
          settings.temperature,
          settings.maxTokens,
        ],
      );
    }

    for (const skill of seed.agentSkills) {
      await client.query(
        `insert into agent_skills (id, name, description, instructions, category, is_system, is_active)
         values ($1,$2,$3,$4,$5,$6,$7)
         on conflict (id) do update set
           name=excluded.name,
           description=excluded.description,
           instructions=excluded.instructions,
           category=excluded.category,
           is_system=excluded.is_system,
           is_active=excluded.is_active`,
        [skill.id, skill.name, skill.description, skill.instructions, skill.category, skill.isSystem, skill.isActive],
      );
    }

    for (const tool of seed.agentTools) {
      await client.query(
        `insert into agent_tools (id, name, description, category, permission, requires_confirmation, schema, is_system, is_active)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         on conflict (id) do update set
           name=excluded.name,
           description=excluded.description,
           category=excluded.category,
           permission=excluded.permission,
           requires_confirmation=excluded.requires_confirmation,
           schema=excluded.schema,
           is_system=excluded.is_system,
           is_active=excluded.is_active`,
        [tool.id, tool.name, tool.description, tool.category, tool.permission, tool.requiresConfirmation, tool.schema, tool.isSystem, tool.isActive],
      );
    }

    await client.query("delete from chatbot_skills");
    for (const item of seed.chatbotSkills) {
      await client.query(
        `insert into chatbot_skills (chatbot_id, skill_id, is_enabled) values ($1,$2,$3)`,
        [item.chatbotId, item.skillId, item.isEnabled],
      );
    }

    await client.query("delete from chatbot_tools");
    for (const item of seed.chatbotTools) {
      await client.query(
        `insert into chatbot_tools (chatbot_id, tool_id, is_enabled) values ($1,$2,$3)`,
        [item.chatbotId, item.toolId, item.isEnabled],
      );
    }

    await client.query("select setval('chatbots_id_seq', greatest((select coalesce(max(id), 1) from chatbots), 1), true)");
    await client.query("select setval('model_catalog_id_seq', greatest((select coalesce(max(id), 1) from model_catalog), 1), true)");
    await client.query("select setval('chatbot_skills_id_seq', greatest((select coalesce(max(id), 1) from chatbot_skills), 1), true)");
    await client.query("select setval('chatbot_tools_id_seq', greatest((select coalesce(max(id), 1) from chatbot_tools), 1), true)");

    await client.query("commit");
    console.log("Seed aplicado correctamente.");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
