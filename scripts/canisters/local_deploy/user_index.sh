#!/usr/bin/env bash
set -euo pipefail

export GLOBAL_OWNER_PRINCIPAL_ID=$(dfx identity get-principal)

dfx canister create --no-wallet individual_user_template
dfx canister create --no-wallet user_index
dfx canister create --no-wallet post_cache

export CANISTER_ID_user_index=$(dfx canister id user_index)
export CANISTER_ID_post_cache=$(dfx canister id post_cache)
export LOCAL_TOP_POSTS_SYNC_INTERVAL="10000000000"

dfx build individual_user_template
dfx build user_index

cargo test --package individual_user_template
cargo test --package user_index

dfx canister install user_index --mode upgrade

dfx generate individual_user_template
dfx generate user_index
