// src/screens/Paciente/PacienteForm.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { consultarCep } from '../services/viacep';

const BASE_URL = 'http://192.168.56.1:3000';

const initialPacienteState = {
  nome: '',
  email: '',
  telefone: '',
  dataNascimento: '',
  cpf: '',
  cep: '',
  logradouro: '',
  numero: '',
  bairro: '',
  cidade: '',
  uf: '',
  complemento: ''
};

const ValidatedInput = ({ label, name, value, onChangeText, error, ...props }) => (
  <View style={formStyles.inputGroup}>
    <Text style={formStyles.label}>{label}</Text>
    <TextInput
      style={[formStyles.input, error && formStyles.inputError]}
      value={value}
      onChangeText={(text) => onChangeText(name, text)}
      {...props}
    />
    {error && <Text style={formStyles.errorText}>{error}</Text>}
  </View>
);

const PacienteForm = ({ route, navigation }) => {
  const pacienteParam = route?.params || null;

  const [formData, setFormData] = useState(pacienteParam || initialPacienteState);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Estados para o serviço de CEP
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [avisoCep, setAvisoCep] = useState('');

  const isEditing = !!pacienteParam?.id;
  const buttonTitle = isEditing ? 'Concluir Edição' : 'Concluir Cadastro';

  const requiredFields = [
    'nome', 'cpf', 'dataNascimento', 'email', 'telefone',
    'cep', 'logradouro', 'numero', 'bairro', 'cidade', 'uf'
  ];

  useEffect(() => {
    if (pacienteParam) {
      setFormData(pacienteParam);
    }
  }, [pacienteParam]);

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Dispara a consulta no onBlur quando o CEP tiver 8 dígitos
  const handleBuscarCep = async () => {
    const cepLimpo = (formData.cep || '').replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    setBuscandoCep(true);
    setAvisoCep('');

    try {
      const enderecoEncontrado = await consultarCep(formData.cep);
      
      // Preenche os campos automaticamente
      setFormData(prev => ({
        ...prev,
        logradouro: enderecoEncontrado.logradouro || prev.logradouro,
        bairro: enderecoEncontrado.bairro || prev.bairro,
        cidade: enderecoEncontrado.cidade || prev.cidade,
        uf: enderecoEncontrado.uf || prev.uf,
      }));
    } catch (erro) {
      // Aviso não-fatal: informa o ocorrido mas deixa os campos livres para digitação manual
      setAvisoCep(`${erro.message} Preencha os dados de endereço manualmente.`);
    } finally {
      setBuscandoCep(false);
    }
  };

  const validate = () => {
    let valid = true;
    const newErrors = {};

    requiredFields.forEach(field => {
      if (!formData[field] || String(formData[field]).trim() === '') {
        newErrors[field] = 'Campo Obrigatório';
        valid = false;
      }
    });

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setSaving(true);

    try {
      const url = isEditing 
        ? `${BASE_URL}/pacientes/${formData.id}` 
        : `${BASE_URL}/pacientes`;
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        Alert.alert(
          'Sucesso',
          isEditing ? 'Dados do paciente atualizados!' : 'Paciente cadastrado com sucesso!'
        );
        navigation.goBack();
      } else {
        Alert.alert('Erro', `Falha ao salvar dados. Status: ${response.status}`);
      }
    } catch (e) {
      Alert.alert('Erro', 'Falha na conexão com o servidor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Text style={styles.title}>{isEditing ? 'Editar Paciente' : 'Novo Paciente'}</Text>

        {/* 1. DADOS PESSOAIS */}
        <Text style={styles.sectionHeader}>1. Dados Pessoais</Text>
        <ValidatedInput 
          label="Nome Completo" 
          name="nome" 
          value={formData.nome}
          onChangeText={handleChange}
          error={errors.nome}
          placeholder="Ex: Ana Maria da Silva" 
        />

        <ValidatedInput 
          label="CPF" 
          name="cpf" 
          value={formData.cpf}
          onChangeText={handleChange}
          error={errors.cpf}
          placeholder="111.222.333-44" 
          keyboardType="numeric"
        />

        <ValidatedInput 
          label="Data de Nascimento" 
          name="dataNascimento" 
          value={formData.dataNascimento}
          onChangeText={handleChange}
          error={errors.dataNascimento}
          placeholder="DD/MM/AAAA" 
        />

        {/* 2. CONTATOS */}
        <Text style={styles.sectionHeader}>2. Contatos</Text>
        <ValidatedInput 
          label="E-mail" 
          name="email" 
          value={formData.email}
          onChangeText={handleChange}
          error={errors.email}
          placeholder="email@exemplo.com" 
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <ValidatedInput 
          label="Telefone Celular" 
          name="telefone"  
          value={formData.telefone}
          onChangeText={handleChange}
          error={errors.telefone}
          placeholder="(XX) XXXXX-XXXX" 
          keyboardType="phone-pad"
        />

        {/* 3. LOGRADOURO */}
        <Text style={styles.sectionHeader}>3. Logradouro</Text>
        
        <ValidatedInput 
          label="CEP" 
          name="cep" 
          value={formData.cep}
          onChangeText={handleChange}
          onBlur={handleBuscarCep}
          error={errors.cep}
          placeholder="00000-000" 
          keyboardType="numeric"
          maxLength={9}
        />

        {/* Indicador de carregamento do CEP */}
        {buscandoCep && (
          <View style={styles.feedbackCep}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.textoCarregandoCep}> Buscando endereço no ViaCEP...</Text>
          </View>
        )}

        {/* Mensagem de aviso em caso de falha não-fatal no CEP */}
        {!!avisoCep && (
          <View style={styles.caixaAvisoCep}>
            <Text style={styles.textoAvisoCep}>{avisoCep}</Text>
          </View>
        )}

        <ValidatedInput 
          label="Logradouro / Rua" 
          name="logradouro" 
          value={formData.logradouro}
          onChangeText={handleChange}
          error={errors.logradouro}
          placeholder="Ex: Av. Paulista" 
        />

        <ValidatedInput 
          label="Número" 
          name="numero" 
          value={formData.numero}
          onChangeText={handleChange}
          error={errors.numero}
          placeholder="123" 
          keyboardType="numeric"
        />

        <ValidatedInput 
          label="Complemento (Opcional)" 
          name="complemento" 
          value={formData.complemento}
          onChangeText={handleChange}
          error={errors.complemento}
          placeholder="Apto 45, Bloco B" 
        />

        <ValidatedInput 
          label="Bairro" 
          name="bairro" 
          value={formData.bairro}
          onChangeText={handleChange}
          error={errors.bairro}
          placeholder="Centro" 
        />

        <ValidatedInput 
          label="Cidade" 
          name="cidade" 
          value={formData.cidade}
          onChangeText={handleChange}
          error={errors.cidade}
          placeholder="São Paulo" 
        />

        <ValidatedInput 
          label="Estado (UF)" 
          name="uf" 
          value={formData.uf}
          onChangeText={handleChange}
          error={errors.uf}
          placeholder="SP" 
          maxLength={2}
          autoCapitalize="characters"
        />

      </ScrollView>

      {/* BOTÕES FIXOS */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[formStyles.button, formStyles.saveButton]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={formStyles.buttonText}>{buttonTitle}</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[formStyles.button, formStyles.cancelButton]}
          onPress={() => navigation.goBack()}
          disabled={saving}
        >
          <Text style={formStyles.buttonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#333' },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    color: '#007AFF',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  feedbackCep: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  textoCarregandoCep: { color: '#007AFF', fontSize: 13, marginLeft: 6 },
  caixaAvisoCep: {
    padding: 10,
    backgroundColor: '#fff3cd',
    borderColor: '#ffeeba',
    borderWidth: 1,
    borderRadius: 6,
    marginBottom: 15,
  },
  textoAvisoCep: { color: '#856404', fontSize: 13 },
  buttonContainer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

const formStyles = StyleSheet.create({
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, marginBottom: 5, fontWeight: '500', color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    height: 45,
  },
  inputError: { borderColor: 'red', borderWidth: 2, backgroundColor: '#ffe8e8' },
  errorText: { fontSize: 12, color: 'red', marginTop: 4 },
  button: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  saveButton: { backgroundColor: '#007AFF' },
  cancelButton: { backgroundColor: '#6c757d' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default PacienteForm;