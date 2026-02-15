export function getIdentityFromUser(user) {
  if (!user) return 'guest'
  return user.id || user.user_id || user.email || user.account || user.name || 'guest'
}

export function getUserStorageKey(baseKey, user) {
  const identity = getIdentityFromUser(user)
  return `${baseKey}::${identity}`
}

export function getStorageKeyForId(baseKey, identity) {
  const id = identity || 'guest'
  return `${baseKey}::${id}`
}
