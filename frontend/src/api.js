const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * 認証トークン付きでAPIリクエストを送信する共通関数
 * @param {string} url - リクエスト先のURL (ベースURL以降)
 * @param {object} options - fetchのオプション (headers, method, bodyなど)
 * @returns {Promise<any>} - fetchのレスポンス (JSONパース済み)
 */
export async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('coffee_token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${url}`, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || 'APIリクエストに失敗しました');
  }

  // DELETEなど、レスポンスボディがない場合を考慮
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.indexOf('application/json') !== -1) {
    return response.json();
  }
  return {}; // ボディがない場合は空のオブジェクトを返す
}

/**
 * ログインAPI
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{access_token: string}>}
 */
export async function login(email, password) {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  const response = await fetch(`${BASE_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('ログインに失敗しました。メールアドレスかパスワードを確認してください。');
  }
  return response.json();
}

/**
 * 新規ユーザー登録API
 * @param {object} userData - {email, password, name}
 * @returns {Promise<any>}
 */
export function registerUser(userData) {
  return fetchWithAuth('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

/**
 * 現在のユーザー情報を取得するAPI
 * @returns {Promise<any>}
 */
export function getCurrentUser() {
  return fetchWithAuth('/users/me');
}

/**
 * 設定情報を取得するAPI
 * @returns {Promise<any>}
 */
export function getSettings() {
  return fetchWithAuth('/settings');
}

/**
 * 商品一覧を取得するAPI
 * @returns {Promise<any>}
 */
export function getProducts() {
  return fetchWithAuth('/products');
}

/**
 * デリバリー注文を作成するAPI
 * @param {object} orderData
 * @returns {Promise<any>}
 */
export function createOrder(orderData) {
  return fetchWithAuth('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
}

/**
 * 焙煎豆の注文を作成するAPI
 * @param {object} orderData
 * @returns {Promise<any>}
 */
export function createBeanOrder(orderData) {
  return fetchWithAuth('/bean_orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
}

/**
 * 注文履歴を取得するAPI
 * @returns {Promise<any>}
 */
export function getOrderHistory() {
  return fetchWithAuth('/orders/me');
}

/**
 * 全ての在庫を取得するAPI (管理者用)
 * @returns {Promise<any>}
 */
export function getAllInventory() {
  return fetchWithAuth('/admin/all_inventory');
}

/**
 * 全ての注文を取得するAPI (管理者用)
 * @returns {Promise<any>}
 */
export function getAllOrders() {
  return fetchWithAuth('/admin/all_orders');
}

/**
 * 注文ステータスを更新するAPI (管理者用)
 * @param {string} orderId
 * @param {string} newStatus
 * @param {string} orderType - 'delivery' or 'bean'
 * @returns {Promise<any>}
 */
export function updateOrderStatus(orderId, newStatus, orderType) {
  const url = orderType === 'delivery'
    ? `/admin/orders/${orderId}/status`
    : `/admin/bean_orders/${orderId}/status`;
  return fetchWithAuth(url, {
    method: 'PATCH',
    body: JSON.stringify({ status: newStatus }),
  });
}

/**
 * 商品情報を更新するAPI (管理者用)
 * @param {string} productId
 * @param {object} productData
 * @returns {Promise<any>}
 */
export function updateProductInfo(productId, productData) {
  return fetchWithAuth(`/admin/products/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify(productData),
  });
}

/**
 * ユーザー情報を更新するAPI
 * @param {object} userData
 * @returns {Promise<any>}
 */
export function updateUserMe(userData) {
  return fetchWithAuth('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(userData),
  });
}

/**
 * すべてのサブスクリプション契約を取得する (管理者用)
 * @returns {Promise<any>}
 */
export function getAllSubscriptions() {
  return fetchWithAuth('/admin/subscriptions');
}

/**
 * すべてのユーザーを取得する (管理者用)
 * @returns {Promise<any>}
 */
export function getAllUsers() {
  return fetchWithAuth('/admin/users');
}

/**
 * 新規サブスクリプション契約を作成する (管理者用)
 * @param {object} contractData
 * @returns {Promise<any>}
 */
export function createSubscription(contractData) {
  return fetchWithAuth('/admin/subscriptions', {
    method: 'POST',
    body: JSON.stringify(contractData),
  });
}

/**
 * 指定されたIDの焙煎豆注文詳細を取得する (管理者用)
 * @param {string} orderId
 * @returns {Promise<any>}
 */
export function getBeanOrderDetail(orderId) {
  return fetchWithAuth(`/admin/bean_orders/${orderId}`);
}