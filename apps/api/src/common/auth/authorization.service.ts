import { ForbiddenException, Injectable } from "@nestjs/common";

import { AppRole, AuthenticatedUser } from "./auth.types";

@Injectable()
export class AuthorizationService {
  isPrivileged(user: AuthenticatedUser) {
    return user.role === "ADMIN" || user.role === "OPERATOR";
  }

  assertRoles(user: AuthenticatedUser, roles: AppRole[], message = "You do not have access to this resource") {
    if (!roles.includes(user.role)) {
      throw new ForbiddenException(message);
    }
  }

  assertSelfOrPrivileged(
    user: AuthenticatedUser,
    targetUserId: string,
    message = "You do not have access to this resource"
  ) {
    if (user.id !== targetUserId && !this.isPrivileged(user)) {
      throw new ForbiddenException(message);
    }
  }
}
