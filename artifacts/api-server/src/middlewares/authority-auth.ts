import { type Request, type Response, type NextFunction } from "express";
import { createSupabaseClientWithToken } from "../lib/supabase-server.js";
import { logger } from "../lib/logger.js";

export interface AuthorityUserRecord {
  id: string;
  department_id: string;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  auth_user_id: string | null;
  created_at: string;
  departments: {
    id: string;
    slug: string;
    name: string;
    name_bn: string;
    jurisdiction_area: string;
    issue_categories: string[];
  };
}

export interface AuthorityRequest extends Request {
  authorityUser?: AuthorityUserRecord;
  accessToken?: string;
}

export async function requireAuthorityAuth(
  req: AuthorityRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing authorization header" });
    return;
  }

  const accessToken = authHeader.slice(7);

  try {
    const supabase = createSupabaseClientWithToken(accessToken);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const { data: authorityUser, error: auError } = await supabase
      .from("authority_users")
      .select(
        "*, departments(id, slug, name, name_bn, jurisdiction_area, issue_categories)",
      )
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .single();

    if (auError || !authorityUser) {
      req.log.warn({ userId: user.id }, "Authority user not found");
      res.status(401).json({ error: "Not an authorized authority user" });
      return;
    }

    req.authorityUser = authorityUser as AuthorityUserRecord;
    req.accessToken = accessToken;
    next();
  } catch (err) {
    logger.error({ err }, "Authority auth middleware error");
    res.status(500).json({ error: "Internal server error" });
  }
}
