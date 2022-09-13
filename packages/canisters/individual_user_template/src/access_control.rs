use crate::AccessControlMap;
use candid::Principal;
use ic_stable_memory::{s, utils::ic_types::SPrincipal};
use shared_utils::access_control::{self, add_role_to_principal_id, UserAccessRole};

pub mod util;

#[ic_cdk_macros::update]
#[candid::candid_method(update)]
fn update_user_add_role(role: UserAccessRole, principal_id: Principal) {
    let mut user_id_access_control_map = s!(AccessControlMap);
    add_role_to_principal_id(
        &mut user_id_access_control_map,
        SPrincipal(principal_id),
        role,
    );
    s! { AccessControlMap = user_id_access_control_map };
}

#[ic_cdk_macros::update]
#[candid::candid_method(update)]
fn update_user_remove_role(role: UserAccessRole, principal_id: Principal) {
    let mut user_id_access_control_map = s!(AccessControlMap);
    access_control::remove_role_from_principal_id(
        &mut user_id_access_control_map,
        SPrincipal(principal_id),
        role,
    );
    s! { AccessControlMap = user_id_access_control_map };
}

#[ic_cdk_macros::query]
#[candid::candid_method(query)]
fn get_user_roles(principal_id: Principal) -> Vec<UserAccessRole> {
    let user_id_access_control_map = s!(AccessControlMap);
    access_control::get_role_for_principal_id(&user_id_access_control_map, SPrincipal(principal_id))
}
