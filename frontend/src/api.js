const API_BASE = "http://127.0.0.1:8000/api";

// Offline Queue Keys
const OFFLINE_QUEUE_KEY = "foodloop_offline_donations";
const NETWORK_MODE_KEY = "foodloop_simulated_network"; // 'online' | 'poor' | 'offline'

export const getNetworkMode = () => {
  return localStorage.getItem(NETWORK_MODE_KEY) || "online";
};

export const setNetworkMode = (mode) => {
  localStorage.setItem(NETWORK_MODE_KEY, mode);
  window.dispatchEvent(new Event("foodloop_network_change"));
};

export const getOfflineQueue = () => {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

// Session Donations Storage Key (preserves newly created donations in current session)
const SESSION_DONATIONS_KEY = "foodloop_session_donations";

export const getSessionDonations = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_DONATIONS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    const legacyMockIds = new Set([
      "FL-1024", "FL-1025", "FL-1026", "FL-1027", "FL-1028", "FL-1029",
      "FL-1030", "FL-1031", "FL-1032", "FL-1033", "FL-1034", "FL-1035",
      "FL-1036", "FL-1037", "FL-1038", "FL-1039", "FL-1040", "FL-1041",
      "FL-1042", "FL-1043", "FL-1044"
    ]);
    return list.filter((d) => !legacyMockIds.has(d.id));
  } catch (e) {
    return [];
  }
};

export const saveSessionDonation = (donation) => {
  try {
    const current = getSessionDonations();
    const updated = [donation, ...current.filter((d) => d.id !== donation.id)];
    sessionStorage.setItem(SESSION_DONATIONS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("foodloop_donation_created", { detail: donation }));
    return updated;
  } catch (e) {
    return [];
  }
};

export const saveOfflineDonation = (donationData) => {
  const queue = getOfflineQueue();
  const offlineId = `OFFLINE-FL-${Date.now().toString().slice(-4)}`;
  const item = {
    ...donationData,
    offline_local_id: offlineId,
    is_offline_synced: 0,
    queued_at: new Date().toISOString(),
    retry_count: 0
  };
  queue.push(item);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event("foodloop_queue_change"));
  return item;
};

// API Client Helper
async function request(endpoint, options = {}) {
  const mode = getNetworkMode();

  if (mode === "offline") {
    throw new Error("Device is offline. Saved to offline queue.");
  }

  if (mode === "poor") {
    // Simulate high latency and 30% chance of transient drop
    await new Promise((resolve) => setTimeout(resolve, 1200));
    if (Math.random() < 0.3) {
      throw new Error("Network timeout: Poor connection detected.");
    }
  }

  const url = `${API_BASE}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers: options.body instanceof FormData ? undefined : headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Users & Auth
  getUsers: () => request("/users"),
  getUserProfile: (id) => request(`/users/${id}`),

  // Donations
  getDonations: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const sessionItems = getSessionDonations();
    try {
      const res = await request(`/donations${query ? `?${query}` : ""}`);
      const apiDonations = res.donations || [];
      const apiIds = new Set(apiDonations.map((d) => d.id));

      let matchedSession = sessionItems.filter((d) => !apiIds.has(d.id));
      if (params.donor_id) {
        matchedSession = matchedSession.filter((d) => d.donor_id === params.donor_id);
      }
      if (params.status) {
        matchedSession = matchedSession.filter((d) => d.status === params.status);
      }
      if (params.category) {
        matchedSession = matchedSession.filter((d) => d.food_category === params.category);
      }

      return {
        donations: [...matchedSession, ...apiDonations]
      };
    } catch (err) {
      let filtered = sessionItems;
      if (params.donor_id) {
        filtered = filtered.filter((d) => d.donor_id === params.donor_id);
      }
      if (params.status) {
        filtered = filtered.filter((d) => d.status === params.status);
      }
      return { donations: filtered };
    }
  },
  getDonationDetail: (id) => request(`/donations/${id}`),
  createDonation: async (donationData) => {
    const mode = getNetworkMode();
    const offlineItem = saveOfflineDonation(donationData);
    const fallbackDonation = {
      id: offlineItem.offline_local_id,
      donor_id: donationData.donor_id || "donor-1",
      food_category: donationData.food_category,
      title: donationData.title,
      description: donationData.description,
      photo_url: donationData.photo_url || "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80",
      quantity: parseFloat(donationData.quantity),
      unit: donationData.unit,
      preparation_time: donationData.preparation_time,
      location_name: donationData.location_name,
      latitude: donationData.latitude,
      longitude: donationData.longitude,
      status: "LISTED",
      claim_quantity_remaining: parseFloat(donationData.quantity),
      created_at: new Date().toISOString()
    };

    if (mode === "offline") {
      saveSessionDonation(fallbackDonation);
      return {
        status: "offline_queued",
        donation_id: offlineItem.offline_local_id,
        message: "Saved securely to offline queue. Will auto-sync when connection restores.",
        donation: fallbackDonation,
        offlineItem
      };
    }
    try {
      const res = await request("/donations", {
        method: "POST",
        body: JSON.stringify(donationData),
      });
      const donationObj = res.donation || {
        ...fallbackDonation,
        id: res.donation_id || fallbackDonation.id
      };
      saveSessionDonation(donationObj);
      return {
        ...res,
        donation: donationObj
      };
    } catch (err) {
      saveSessionDonation(fallbackDonation);
      return {
        status: "offline_queued",
        donation_id: offlineItem.offline_local_id,
        message: "Network error. Donation preserved locally in sync queue.",
        donation: fallbackDonation,
        offlineItem
      };
    }
  },
  aiAnalyze: async (formData) => {
    return request("/donations/ai-analyze", {
      method: "POST",
      body: formData,
    });
  },
  routeToRecovery: (donationId) => request(`/donations/${donationId}/route-to-recovery`, { method: "POST" }),

  // Split Claims
  claimDonation: (donationId, recipientId, quantity) =>
    request(`/donations/${donationId}/claim`, {
      method: "POST",
      body: JSON.stringify({ recipient_id: recipientId, quantity: parseFloat(quantity) }),
    }),
  confirmClaimReceipt: (claimId) => request(`/claims/${claimId}/confirm`, { method: "POST" }),

  // Volunteers
  getVolunteerTasks: (volunteerId) => {
    const query = volunteerId ? `?volunteer_id=${volunteerId}` : "";
    return request(`/volunteers/tasks${query}`);
  },
  acceptTask: (taskId, volunteerId) =>
    request(`/volunteers/tasks/${taskId}/accept`, {
      method: "POST",
      body: JSON.stringify({ volunteer_id: volunteerId }),
    }),
  markPickedUp: (taskId) => request(`/volunteers/tasks/${taskId}/pickup`, { method: "POST" }),
  markDelivered: (taskId, proofUrl, notes) =>
    request(`/volunteers/tasks/${taskId}/deliver`, {
      method: "POST",
      body: JSON.stringify({ proof_photo_url: proofUrl, notes }),
    }),

  // Food Passport
  getPassport: (donationId) => request(`/passports/${donationId}`),

  // Circular Recovery Hub
  getRecoveryBatches: (status) => {
    const query = status ? `?status=${status}` : "";
    return request(`/recovery/batches${query}`);
  },
  acceptRecoveryBatch: (batchId, partnerId) =>
    request(`/recovery/batches/${batchId}/accept?partner_id=${partnerId}`, { method: "POST" }),
  verifyBatchWeight: (batchId, weight, notes) =>
    request(`/recovery/batches/${batchId}/verify-weight?verified_weight=${weight}&notes=${encodeURIComponent(notes || "")}`, { method: "POST" }),
  getRecoveryPartners: () => request("/recovery/partners"),

  // Practical Rewards & Streaks
  getRewards: () => request("/rewards"),
  redeemReward: (userId, rewardId) =>
    request("/rewards/redeem", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, reward_id: rewardId }),
    }),
  getUserRedemptions: (userId) => request(`/rewards/my-redemptions/${userId}`),

  // Trees & Forest
  getMyForest: (userId) => request(`/trees/my-forest/${userId}`),
  getCommunityForest: () => request("/trees/community"),

  // Impact & Analytics
  getImpactSummary: () => request("/impact/summary"),
  getHeatmapData: () => request("/analytics/heatmap"),
  getLeaderboards: () => request("/leaderboards"),

  // SMS Fallback Gateway
  sendSMS: (fromPhone, body) =>
    request("/sms/inbound", {
      method: "POST",
      body: JSON.stringify({ from_phone: fromPhone, body }),
    }),
  getSMSLogs: () => request("/sms/logs"),

  // Admin
  getRewardConfig: () => request("/admin/reward-config"),
  updateRewardConfig: (configs) =>
    request("/admin/reward-config", {
      method: "POST",
      body: JSON.stringify({ configs }),
    }),
  verifyUser: (userId) => request(`/admin/verify-user/${userId}`, { method: "POST" }),
  getAuditLogs: () => request("/admin/audit-logs"),
};

// Automatic Synchronization Engine for Offline Queue
export const processOfflineSync = async (onSyncItemSuccess) => {
  const mode = getNetworkMode();
  if (mode === "offline") return;

  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  const remaining = [];
  for (const item of queue) {
    try {
      // Exponential backoff wait based on retry_count
      const delay = Math.min(1000 * Math.pow(2, item.retry_count || 0), 10000);
      await new Promise((r) => setTimeout(r, Math.min(delay, 500)));

      const payload = {
        ...item,
        is_offline_synced: 1,
      };
      delete payload.queued_at;
      delete payload.retry_count;

      const res = await request("/donations", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (onSyncItemSuccess) {
        onSyncItemSuccess(item, res);
      }
    } catch (err) {
      console.warn("Sync retry postponed for item:", item.offline_local_id, err);
      item.retry_count = (item.retry_count || 0) + 1;
      remaining.push(item);
    }
  }

  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  window.dispatchEvent(new Event("foodloop_queue_change"));
};
