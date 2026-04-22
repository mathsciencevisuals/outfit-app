import { SetMetadata } from "@nestjs/common";

import { AppRole } from "./auth.types";

export const REQUIRED_ROLES = "requiredRoles";

export const Roles = (...roles: AppRole[]) => SetMetadata(REQUIRED_ROLES, roles);
