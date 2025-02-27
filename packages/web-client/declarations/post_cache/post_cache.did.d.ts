import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

export type KnownPrincipalType = { 'CanisterIdUserIndex' : null } |
  { 'CanisterIdConfiguration' : null } |
  { 'CanisterIdProjectMemberIndex' : null } |
  { 'CanisterIdTopicCacheIndex' : null } |
  { 'CanisterIdRootCanister' : null } |
  { 'CanisterIdDataBackup' : null } |
  { 'CanisterIdPostCache' : null } |
  { 'CanisterIdSNSController' : null } |
  { 'UserIdGlobalSuperAdmin' : null };
export interface PostCacheInitArgs {
  'known_principal_ids' : [] | [Array<[KnownPrincipalType, Principal]>],
}
export interface PostScoreIndexItem {
  'post_id' : bigint,
  'score' : bigint,
  'publisher_canister_id' : Principal,
}
export type Result = { 'Ok' : Array<PostScoreIndexItem> } |
  { 'Err' : TopPostsFetchError };
export type TopPostsFetchError = { 'ReachedEndOfItemsList' : null } |
  { 'InvalidBoundsPassed' : null } |
  { 'ExceededMaxNumberOfItemsAllowedInOneRequest' : null };
export interface _SERVICE {
  'get_top_posts_aggregated_from_canisters_on_this_network_for_home_feed' : ActorMethod<
    [bigint, bigint],
    Result
  >,
  'get_top_posts_aggregated_from_canisters_on_this_network_for_hot_or_not_feed' : ActorMethod<
    [bigint, bigint],
    Result
  >,
  'get_well_known_principal_value' : ActorMethod<
    [KnownPrincipalType],
    [] | [Principal]
  >,
  'receive_top_home_feed_posts_from_publishing_canister' : ActorMethod<
    [Array<PostScoreIndexItem>],
    undefined
  >,
  'receive_top_hot_or_not_feed_posts_from_publishing_canister' : ActorMethod<
    [Array<PostScoreIndexItem>],
    undefined
  >,
  'remove_all_feed_entries' : ActorMethod<[], undefined>,
}
