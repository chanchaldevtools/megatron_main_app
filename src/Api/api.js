// Api/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const apiUrl = 'https://inextwebs.com/megatron_new/api/v1/';
export const ImageUrls = 'https://inextwebs.com/megatron_new/';

/**
 * Get auth token from AsyncStorage
 */
const getAuthToken = async () => {
  try {
    const token = await AsyncStorage.getItem('Token');
    return token;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

/**
 * Get auth headers with token
 */
export const getAuthHeaders = async () => {
  const token = await getAuthToken();
  return {
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

/**
 * Sends OTP to the user's mobile number.
 */
export const sendOTP = async (mobileNumber) => {
  try {
    const formData = new FormData();
    formData.append('mobile', mobileNumber);
    const response = await axios.post(`${apiUrl}send-otp`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    throw new Error('Error sending OTP: ' + error.message);
  }
};

/**
 * Verifies the OTP provided by the user.
 */
export const VerifyOTP = async (mobileNumber, Otp) => {
  try {
    const formData = new FormData();
    const otpString = Array.isArray(Otp) ? Otp.join('') : Otp.toString();
    formData.append('otp', otpString);
    formData.append('mobile', mobileNumber);
    const response = await axios.post(`${apiUrl}verify-otp`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    throw new Error('Error verifying OTP: ' + error.message);
  }
};

/**
 * Get all transports
 */
// Api/api.js - Update getTransports function

/**
 * Get transports with pagination and filters
 * @param {Object} params - Search parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.per_page - Items per page (default: 10)
 * @param {string} params.search - Search term
 * @param {string} params.date - Date filter
 * @param {string} params.start_date - Start date
 * @param {string} params.end_date - End date
 * @param {string} params.vehicle_number - Vehicle number
 * @param {string} params.bill_number - Bill number
 */
// Api/api.js - Add this function

/**
 * Get transports with pagination and filters (with delay for skeleton demo)
 */
export const getTransports = async (params = {}) => {
  try {
    const token = await getAuthToken();
    
    const queryParams = new URLSearchParams();
    queryParams.append('page', params.page || 1);
    queryParams.append('per_page', params.per_page || 10);
    
    if (params.search) queryParams.append('search', params.search);
    if (params.date) queryParams.append('date', params.date);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.vehicle_number) queryParams.append('vehicle_number', params.vehicle_number);
    if (params.bill_number) queryParams.append('bill_number', params.bill_number);
    
    const url = `${apiUrl}transports?${queryParams.toString()}`;
    
    // Simulate network delay for skeleton loading demo (remove in production)
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return response.data;
  } catch (error) {
    throw new Error('Error fetching transports: ' + error.message);
  }
};
// Api/api.js - Add these functions

/**
 * Get single transport by ID
 * @param {number|string} id - Transport ID
 */
export const getTransportById = async (id) => {
  try {
    const token = await getAuthToken();
    const response = await axios.get(`${apiUrl}transports/${id}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error('Error fetching transport: ' + error.message);
  }
};

/**
 * Update transport by ID
 * @param {number|string} id - Transport ID
 * @param {Object} data - Transport data to update
 */
export const updateTransport = async (id, data) => {
  try {
    const token = await getAuthToken();
    const response = await axios.put(`${apiUrl}transports/${id}`, data, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    throw new Error('Error updating transport: ' + error.message);
  }
};
/**
 * Get all clients
 */
export const getClients = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${apiUrl}client`, { headers });
    return response.data;
  } catch (error) {
    throw new Error('Error fetching clients: ' + error.message);
  }
};

/**
 * Add new transport
 */
export const addTransport = async (formData) => {
  try {
    const token = await getAuthToken();
    const response = await axios.post(`${apiUrl}transports`, formData, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    throw new Error('Error adding transport: ' + error.message);
  }
};

/**
 * Get transaction details by transport ID
 * @param {number|string} transportId - Transport ID
 */
export const getTransactions = async (transportId) => {
  try {
    const token = await getAuthToken();
     const response = await axios.get(`${apiUrl}transactions/${transportId}`, {
     
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return response.data;
  } catch (error) {
    throw new Error('Error fetching transactions: ' + error.message);
  }
};
// Get transaction counts for dashboard
export const getTransactionCounts = async () => {
  try {
    const token = await getAuthToken();

    const response = await axios.post(
      `${apiUrl}transactions/stats`,
      {}, // <-- request body (empty, since this endpoint needs no payload)
      {
        // <-- config (this is where headers actually belong)
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching transaction counts:', error);
    throw new Error('Error fetching transaction counts: ' + error.message);
  }
};
export const getTransactionsLists = async (formData) => {
  try {
    const token = await getAuthToken();
    
    // Create FormData for multipart/form-data
    const formDataToSend = new FormData();
    formDataToSend.append('page', formData.page.toString());
    formDataToSend.append('limit', formData.limit.toString());
    if (formData.status) {
      formDataToSend.append('status', formData.status);
    }
    
    console.log('Fetching transactions with page:', formData.page);
    
    const response = await axios.post(`${apiUrl}transactions/list`, formDataToSend, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('API Response meta:', response.data.meta);
    
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw new Error('Error fetching transactions: ' + error.message);
  }
};

// Add this function to your api.js file

export const deleteTransaction = async (transactionId) => {
  try {
    const token = await getAuthToken();
    
    const response = await axios.delete(`${apiUrl}transactions/${transactionId}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Delete Transaction Error:', error);
    throw new Error('Error deleting transaction: ' + error.message);
  }
};

export const getDocumentTypes = async () => {
  try {
    const token = await getAuthToken();
    const response = await axios.get(`${apiUrl}document-types/list`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error('Error fetching document types: ' + error.message);
  }
};

/**
 * Upload document
 * @param {Object} data - FormData with transport_id, document_type_id, file
 */
export const uploadDocument = async (formData) => {
  try {
    const token = await getAuthToken();
    const response = await axios.post(`${apiUrl}transport-documents`, formData, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    throw new Error('Error uploading document: ' + error.message);
  }
};

/**
 * Get transport documents
 * @param {number|string} transportId - Transport ID
 */
export const getTransportDocuments = async (transportId) => {
  try {
    const token = await getAuthToken();
    const response = await axios.get(`${apiUrl}transport-documents`, {
      params: { transport_id: transportId },
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error('Error fetching documents: ' + error.message);
  }
};

export const addBank = async (bankData) => {
  try {
    const token = await getAuthToken();
    
    const formData = new FormData();
    formData.append('ifsc_code', bankData.ifsc_code);
    formData.append('bank_name', bankData.bank_name);
    formData.append('account_holder_name', bankData.account_holder_name);
    formData.append('branch', bankData.branch);
    formData.append('account_number', bankData.account_number);

    const response = await axios.post(`${apiUrl}bank-accounts`, formData, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Add bank error:', error);
    throw new Error('Error adding bank: ' + error.message);
  }
};

/**
 * Verify IFSC Code
 */
export const verifyIFSC = async (ifscCode) => {
  try {
    const token = await getAuthToken();
    const response = await axios.post(`${apiUrl}verify-ifsc`, 
      { ifsc_code: ifscCode },
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Verify IFSC error:', error);
    throw new Error('Error verifying IFSC: ' + error.message);
  }
};

/**
 * Delete bank account
 */
export const deleteBank = async (bankId) => {
  try {
    const token = await getAuthToken();
    const response = await axios.delete(`${apiUrl}bank-accounts/${bankId}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Delete bank error:', error);
    throw new Error('Error deleting bank: ' + error.message);
  }
};

/**
 * Get bank details by ID
 */
export const getBankById = async (bankId) => {
  try {
    const token = await getAuthToken();
    const response = await axios.get(`${apiUrl}bank-accounts/${bankId}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Get bank by ID error:', error);
    throw new Error('Error fetching bank details: ' + error.message);
  }
};

/**
 * Update bank account
 */
export const updateBank = async (bankId, bankData) => {
  try {
    const token = await getAuthToken();
    
    const formData = new FormData();
    formData.append('ifsc_code', bankData.ifsc_code);
    formData.append('bank_name', bankData.bank_name);
    formData.append('account_holder_name', bankData.account_holder_name);
    formData.append('branch', bankData.branch);
    formData.append('account_number', bankData.account_number);

    const response = await axios.post(`${apiUrl}bank-accounts/${bankId}`, formData, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Update bank error:', error);
    throw new Error('Error updating bank: ' + error.message);
  }
};

export const getBanks = async (search = '') => {
  try {
    const token = await getAuthToken();
    let url = `${apiUrl}bank-accounts`;
    if (search && search.trim().length > 0) {
      url += `?search=${encodeURIComponent(search.trim())}`;
    }
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Get banks error:', error);
    throw new Error('Error fetching banks: ' + error.message);
  }
};

// Api/api.js - Add this function

/**
 * Submit a transaction (payment request)
 * @param {Object} data - Transaction data
 * @param {string} data.transport_id - Transport ID
 * @param {string} data.payment_mode - 'Bank', 'UPI', 'QR'
 * @param {string} data.amount - Amount
 * @param {string} data.raise_by - User ID
 * @param {string} data.comment - Note/comment
 * @param {string} data.status - 'Pending'
 * @param {Object} data.bank_details - Bank details object
 * @param {string} data.upi_id - UPI ID (for UPI mode)
 * @param {string} data.qrcode_string - QR code string (for QR mode)
 */
export const submitTransaction = async (data) => {
  try {
    const token = await getAuthToken();
    
    const formData = new FormData();
    formData.append('transport_id', data.transport_id);
    formData.append('payment_mode', data.payment_mode);
    formData.append('amount', data.amount);
    formData.append('comment', data.comment || '');
    // Add UPI ID if present
    if (data.upi_id) {
      formData.append('upi_id', data.upi_id);
    }
    if (data.bank_id) {
      formData.append('bank_id', data.bank_id);
    }
    
    // Add QR code string if present
    if (data.qrcode_string) {
      formData.append('qrcode_string', data.qrcode_string);
    }

    const response = await axios.post(`${apiUrl}transactions`, formData, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Submit transaction error:', error);
    throw new Error('Error submitting transaction: ' + (error.response?.data?.message || error.message));
  }
};

// Api/api.js - Add this function

/**
 * Update transaction status (Approve, Mark as Paid)
 * @param {number|string} transactionId - Transaction ID
 * @param {string} status - 'Approved' or 'Success'
 */
export const updateTransactionStatus = async (transactionId, status) => {
  try {
    const token = await getAuthToken();
    const response = await axios.patch(
      `${apiUrl}transactions/${transactionId}/status`,
      { status: status },
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Update transaction status error:', error);
    throw new Error('Error updating transaction status: ' + (error.response?.data?.message || error.message));
  }
};