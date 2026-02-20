import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Test that we can query the organizations table (will be empty)
    const { data: orgs, error } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .limit(5);

    return Response.json({
      status: "connected",
      user: user ? { id: user.id, email: user.email } : null,
      organizations: orgs ?? [],
      error: error?.message ?? null,
    });
  } catch (err) {
    return Response.json(
      { status: "error", message: String(err) },
      { status: 500 }
    );
  }
}
