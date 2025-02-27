export const ssr = false

import { individualUser } from '$lib/helpers/backend'
import { getCanisterId } from '$lib/helpers/canisterId'
import type { PostPopulated } from '$lib/helpers/feed'
import Log from '$lib/utils/Log'
import userProfile from '$stores/userProfile'
import { Principal } from '@dfinity/principal'
import { redirect } from '@sveltejs/kit'
import { get } from 'svelte/store'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params, fetch }) => {
  try {
    const pid = params.postId
    const id = params.id
    let me = false
    if (!pid || isNaN(Number(pid))) {
      Log({ from: '1 post/[vid] load', pid, id }, 'warn')
      throw redirect(307, '/profile')
    }

    const canId = await getCanisterId(id)
    if (!canId) {
      throw redirect(307, '/profile')
    }

    const userProfileData = get(userProfile)

    if (
      id === userProfileData.unique_user_name ||
      id === userProfileData.principal_id
    )
      me = true

    const post = await individualUser(
      Principal.from(canId),
      fetch,
    ).get_individual_post_details_by_id(BigInt(pid))

    const video: PostPopulated = {
      ...post,
      post_id: BigInt(pid),
      publisher_canister_id: canId,
      score: BigInt(0),
      created_by_user_principal_id: post.created_by_user_principal_id.toText(),
    }
    if (!video) {
      throw redirect(307, '/profile')
    }
    return { me, video }
  } catch (e) {
    Log(
      {
        from: '1 post/[vid] load',
        id: params.id,
        postId: params.postId,
        error: e,
      },
      'warn',
    )
    throw redirect(307, '/profile')
  }
}
