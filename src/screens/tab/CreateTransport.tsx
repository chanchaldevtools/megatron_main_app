// screens/tab/AddTransport.js
import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { getClients, addTransport } from '../../Api/api';
import { useAuth } from '../../context/AuthContext';

export default function AddTransport({ navigation }) {
  const { userData } = useAuth();
  
  const [sourcePlace, setSourcePlace] = useState('');
  const [destinationPlace, setDestinationPlace] = useState('');
  const [transportDate, setTransportDate] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [materialWeight, setMaterialWeight] = useState('');
  const [ratePerTon, setRatePerTon] = useState('');
  const [billNo, setBillNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  // Date Picker State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Smart client search state
  const [clients, setClients] = useState([]);
  const [clientsLoaded, setClientsLoaded] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const blurTimeout = useRef(null);

  // Show Toast function
  const showToast = (type, text1, text2) => {
    Toast.show({
      type: type,
      text1: text1,
      text2: text2,
      position: 'bottom',
      visibilityTime: 3000,
      autoHide: true,
      bottomOffset: 50,
    });
  };

  // Date Picker Handlers
  const handleDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      setTransportDate(`${day}/${month}/${year}`);
    }
  };

  const showDatePickerHandler = () => {
    setShowDatePicker(true);
    Keyboard.dismiss();
  };

  // Fetch client list from server
  const fetchClients = async () => {
    if (clientsLoaded || clientsLoading) return;
    setClientsLoading(true);
    try {
      const response = await getClients();
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.clients)
        ? response.clients
        : [];
      setClients(list);
      setClientsLoaded(true);
    } catch (err) {
      showToast('error', 'Error', 'Could not load client list');
      console.error('Fetch clients error:', err);
    } finally {
      setClientsLoading(false);
    }
  };

  // Filtered suggestions based on what's typed
  const filteredClients = useMemo(() => {
    if (!clientName.trim()) return [];
    const q = clientName.trim().toLowerCase();
    return clients.filter((c) =>
      (c.name || c.client_name || '').toLowerCase().includes(q)
    );
  }, [clientName, clients]);

  const isNewClient =
    clientsLoaded && clientName.trim().length > 0 && filteredClients.length === 0;

  const handleClientFocus = () => {
    setShowSuggestions(true);
    fetchClients();
  };

  const handleClientChange = (text) => {
    setClientName(text);
    setSelectedClientId(null);
    setShowSuggestions(true);
  };

  const handleClientBlur = () => {
    blurTimeout.current = setTimeout(() => setShowSuggestions(false), 150);
  };

  const handleSelectClient = (client) => {
    clearTimeout(blurTimeout.current);
    setClientName(client.name || client.client_name || '');
    setSelectedClientId(client.id);
    setShowSuggestions(false);
    Keyboard.dismiss();
  };

  // Total calculation
  const totalAmount =
    materialWeight && ratePerTon
      ? (parseFloat(materialWeight) * parseFloat(ratePerTon)).toFixed(2)
      : '0.0';

  // Validation
  const validate = () => {
    if (!sourcePlace.trim()) return 'Please enter source place';
    if (!destinationPlace.trim()) return 'Please enter destination place';
    if (!transportDate.trim()) return 'Please select transport date';
    if (!vehicleNumber.trim()) return 'Please enter vehicle number';
    if (!clientName.trim()) return 'Please enter client name';
    if (!materialWeight.trim()) return 'Please enter material weight';
    if (!ratePerTon.trim()) return 'Please enter amount per ton';
    if (!billNo.trim()) return 'Please enter bill number';
    return null;
  };

  // API call to add transport
  const handleAddTransport = async () => {
    const error = validate();
    if (error) {
      showToast('error', 'Missing Information', error);
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('client_id', selectedClientId ? String(selectedClientId) : clientName);
      formData.append('source_place', sourcePlace);
      formData.append('destination_place', destinationPlace);
      formData.append('transport_date', transportDate);
      formData.append('vehicle_number', vehicleNumber);
      formData.append('bill_number', billNo);
      formData.append('material_weight', materialWeight);
      formData.append('rate_per_ton', ratePerTon);
      formData.append('remarks', remarks || '');

      const response = await addTransport(formData);
      console.log('Add Transport Response:', response);

      if (response.status === true || response.success) {
        showToast('success', 'Success', response?.message || 'Transport added successfully');
        resetForm();
        setTimeout(() => navigation.goBack(), 1500);
      } else {
        showToast('error', 'Error', response?.message || 'Failed to add transport');
      }
    } catch (err) {
      console.error('Add transport error:', err);
      showToast('error', 'Network Error', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSourcePlace('');
    setDestinationPlace('');
    setTransportDate('');
    setVehicleNumber('');
    setClientName('');
    setMaterialWeight('');
    setRatePerTon('');
    setBillNo('');
    setRemarks('');
    setSelectedClientId(null);
    setSelectedDate(new Date());
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        

        {/* Form */}
        <View style={styles.form}>
          {/* Source & Destination */}
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Source</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter source"
                placeholderTextColor="#aaa"
                value={sourcePlace}
                onChangeText={setSourcePlace}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Destination</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter destination"
                placeholderTextColor="#aaa"
                value={destinationPlace}
                onChangeText={setDestinationPlace}
              />
            </View>
          </View>

          {/* Date & Vehicle */}
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={showDatePickerHandler}
                activeOpacity={0.7}
              >
                <Text style={[styles.dateText, !transportDate && styles.placeholder]}>
                  {transportDate || 'DD/MM/YYYY'}
                </Text>
                <MaterialIcons name="calendar-today" size={20} color="#006D5B" />
              </TouchableOpacity>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vehicle No.</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter vehicle"
                placeholderTextColor="#aaa"
                autoCapitalize="characters"
                value={vehicleNumber}
                onChangeText={setVehicleNumber}
              />
            </View>
          </View>

          {/* Client */}
          <View style={styles.clientWrap}>
            <Text style={styles.label}>Client</Text>
            <View style={styles.clientInputRow}>
              <TextInput
                style={[styles.input, styles.clientInput]}
                placeholder="Enter client name"
                placeholderTextColor="#aaa"
                value={clientName}
                onChangeText={handleClientChange}
                onFocus={handleClientFocus}
                onBlur={handleClientBlur}
              />
              {clientsLoading && (
                <ActivityIndicator style={styles.clientSpinner} size="small" color="#006D5B" />
              )}
              {!clientsLoading && selectedClientId && (
                <View style={styles.clientBadge}>
                  <MaterialIcons name="check-circle" size={16} color="#2e7d32" />
                  <Text style={styles.clientBadgeText}>Existing</Text>
                </View>
              )}
            </View>

            {showSuggestions && filteredClients.length > 0 && (
              <View style={styles.suggestionBox}>
                <FlatList
                  data={filteredClients}
                  keyExtractor={(item, idx) => String(item.id ?? idx)}
                  keyboardShouldPersistTaps="handled"
                  style={styles.suggestionList}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.suggestionItem}
                      onPress={() => handleSelectClient(item)}
                    >
                      <Text style={styles.suggestionText}>
                        {item.name || item.client_name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {isNewClient && (
              <Text style={styles.newClientHint}>
                ✨ New client will be created
              </Text>
            )}
          </View>

          {/* Weight & Rate */}
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Weight (Ton)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter weight"
                placeholderTextColor="#aaa"
                keyboardType="numeric"
                value={materialWeight}
                onChangeText={setMaterialWeight}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Rate/Ton (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter rate"
                placeholderTextColor="#aaa"
                keyboardType="numeric"
                value={ratePerTon}
                onChangeText={setRatePerTon}
              />
            </View>
          </View>

          {/* Bill No. */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bill No.</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter bill number"
              placeholderTextColor="#aaa"
              value={billNo}
              onChangeText={setBillNo}
            />
          </View>

          {/* Remarks */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Remarks</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add remarks (optional)"
              placeholderTextColor="#aaa"
              value={remarks}
              onChangeText={setRemarks}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Total */}
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹ {totalAmount}</Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            activeOpacity={0.85}
            onPress={handleAddTransport}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="add" size={22} color="#fff" />
                <Text style={styles.submitBtnText}>Add Transport</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* DateTimePicker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#006D5B',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'ios' ? 8 : 14,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerRight: {
    width: 32,
  },
  form: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#fff',
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    backgroundColor: '#fff',
  },
  dateText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  placeholder: {
    color: '#aaa',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  clientWrap: {
    marginBottom: 12,
    position: 'relative',
    zIndex: 20,
  },
  clientInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  clientInput: {
    flex: 1,
  },
  clientSpinner: {
    position: 'absolute',
    right: 14,
  },
  clientBadge: {
    position: 'absolute',
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  clientBadgeText: {
    color: '#2e7d32',
    fontSize: 10,
    fontWeight: '600',
  },
  suggestionBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 180,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionList: {
    borderRadius: 8,
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  newClientHint: {
    color: '#e07b00',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  totalValue: {
    fontSize: 20,
    color: '#006D5B',
    fontWeight: '700',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006D5B',
    borderRadius: 10,
    paddingVertical: 14,
    gap: 8,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});