import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
export async function operator(ctx: Pick<QueryCtx, "auth">) {
  const identity = await ctx.auth.getUserIdentity();
  if (
    !identity ||
    !process.env.OPERATOR_EMAIL ||
    identity.email?.toLowerCase() !== process.env.OPERATOR_EMAIL.toLowerCase()
  )
    throw new ConvexError("Unauthorized");
  return identity.subject;
}
export async function ownedCompany(
  ctx: QueryCtx | MutationCtx,
  id: Id<"companies">,
) {
  const user = await operator(ctx),
    company = await ctx.db.get(id);
  if (!company || company.ownerId !== user)
    throw new ConvexError("Company not found");
  return company;
}
