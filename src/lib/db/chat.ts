import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage, ChatProvider } from "@/types/intelligence";

export async function listChatThreads(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("chat_threads")
    .select("id, title, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(30);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createChatThread(supabase: SupabaseClient, userId: string, title = "New conversation") {
  const { data, error } = await supabase
    .from("chat_threads")
    .insert({ user_id: userId, title })
    .select("id, title, updated_at")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create thread.");
  return data;
}

export async function getThreadMessages(supabase: SupabaseClient, userId: string, threadId: string) {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, role, content, provider, created_at")
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map(
    (row): ChatMessage => ({
      id: row.id,
      role: row.role as ChatMessage["role"],
      content: row.content,
      createdAt: row.created_at,
      provider: (row.provider as ChatProvider | null) ?? undefined,
    }),
  );
}

export async function appendChatMessage(
  supabase: SupabaseClient,
  userId: string,
  threadId: string,
  message: { role: "user" | "assistant"; content: string; provider?: ChatProvider },
) {
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      thread_id: threadId,
      user_id: userId,
      role: message.role,
      content: message.content,
      provider: message.provider ?? null,
    })
    .select("id, role, content, provider, created_at")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to save message.");

  await supabase
    .from("chat_threads")
    .update({
      updated_at: new Date().toISOString(),
      title:
        message.role === "user" && message.content.length > 0
          ? message.content.slice(0, 60)
          : undefined,
    })
    .eq("id", threadId)
    .eq("user_id", userId);

  return {
    id: data.id,
    role: data.role as ChatMessage["role"],
    content: data.content,
    createdAt: data.created_at,
    provider: (data.provider as ChatProvider | null) ?? undefined,
  };
}
