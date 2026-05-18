# Lost & Found for Clubs — Requirements

## Functional requirements
1. Add a new **Lost & Found** library section visible in the app navigation/library index.
2. Lost & Found listings are created as regular library items with category `lost_found`.
3. A Lost & Found listing **must** belong to a club (`clubId` required).
4. Only users with role `admin` or `moderator` in that club can create Lost & Found listings.
5. Non-members cannot create Lost & Found listings for a club.
6. Users creating Lost & Found listings should select a club from clubs where they have posting permissions.

## Validation and authorization
1. Backend enforces all authorization checks regardless of frontend behavior.
2. If `clubId` is missing for `lost_found`, return validation error.
3. If club does not exist, return not found.
4. If user is not an active member, return forbidden.
5. If member role is not `admin` or `moderator`, return forbidden.

## UX requirements
1. Add Lost & Found as a first-class library config (title, slug, labels, descriptions).
2. In create modal, show a required club selector for Lost & Found only.
3. If no club selected, block submission with a clear inline message.

## Non-functional requirements
1. Keep backward compatibility for existing book/toy/tool/event/game flows.
2. Keep changes minimal and localized to listing creation and configuration.
