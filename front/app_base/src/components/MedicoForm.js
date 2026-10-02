// src/components/MedicoForm.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  Platform,
  Image
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';

const especialidades = ['Cardiologia', 'Pediatria', 'Dermatologia', 'Ginecologia', 'Neurologia', 'Oftalmologia', 'Clínica Geral'];

const initialMedicoState = {
  nome: '',
  especialidade: especialidades[0],
  crm: '',
  email: '',
  telefone: '',
  logradouro: '',
  numero: '',
  complemento: '',
  cidade: '',
  uf: '',
  cep: '',
  fotoUri: null,
};

const MedicoForm = ({ medico, onSave, onCancel, navigation }) => {
  const [formData, setFormData] = useState(medico || initialMedicoState);
  
  // Item 5: Estado para a URI da foto[cite: 15]
  const [fotoUri, setFotoUri] = useState(medico?.fotoUri || null);
  
  const [errors, setErrors] = useState({});

  const isEditing = !!medico;
  const buttonTitle = isEditing ? 'Concluir Edição' : 'Concluir Cadastro';

  const requiredFields = [
    'nome', 'especialidade', 'crm', 'email', 'telefone', 
    'logradouro', 'numero', 'cidade', 'uf', 'cep'
  ];

  // Item 10: Atualiza a fotoUri quando o objeto médico muda[cite: 15]
  useEffect(() => {
    setFormData(medico || initialMedicoState);
    setFotoUri(medico?.fotoUri || null);
  }, [medico]);

  // Itens 6, 7 e 8: Função de escolha da foto com validação e aviso de permissão[cite: 15]
  const escolherFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'É preciso conceder acesso à câmera para definir a foto de perfil do médico.'
      );
      return;
    }

    const resultado = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (!resultado.canceled && resultado.assets && resultado.assets[0]) {
      setFotoUri(resultado.assets[0].uri);
    }
  };

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

  const handleSubmit = () => {
    if (validate()) {
      // Item 9: Inclui a fotoUri nos dados devolvidos no submit[cite: 15]
      const dadosParaSalvar = { ...formData, fotoUri };
      
      onSave(dadosParaSalvar); 
      Alert.alert(
        isEditing ? 'Sucesso' : 'Cadastro Concluído', 
        isEditing ? 'Dados do médico atualizados.' : 'Novo médico cadastrado com sucesso!'
      );
      if (navigation) navigation.goBack();
    } else {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios.');
    }
  };

  const ValidatedInput = ({ label, name, ...props }) => (
    <View style={formStyles.inputGroup}>
      <Text style={formStyles.label}>{label}</Text>
      <TextInput
        style={[formStyles.input, errors[name] && formStyles.inputError]}
        value={formData[name]}
        onChangeText={(text) => handleChange(name, text)}
        {...props}
      />
      {errors[name] && <Text style={formStyles.errorText}>{errors[name]}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Text style={styles.title}>{isEditing ? 'Editar Perfil' : 'Novo Cadastro'}</Text>

        {/* Item 9: Destaque da Foto de Perfil no topo do formulário[cite: 15] */}
        <View style={styles.avatarContainer}>
          {fotoUri ? (
            <Image source={{ uri: fotoUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>Sem Foto</Text>
            </View>
          )}
          <TouchableOpacity style={styles.botaoFoto} onPress={escolherFoto}>
            <Text style={styles.botaoFotoTexto}>
              {fotoUri ? 'Alterar Foto' : 'Tirar Foto de Perfil'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 1. PROFISSIONAL */}
        <Text style={styles.sectionHeader}>1. Profissional</Text>
        <ValidatedInput 
          label="Nome Completo" 
          name="nome" 
          placeholder="Ex: Ana Maria da Silva" 
        />
        
        <View style={formStyles.inputGroup}>
          <Text style={formStyles.label}>Especialidade</Text>
          <View style={[formStyles.pickerWrapper, errors.especialidade && formStyles.inputError]}>
            <Picker
              selectedValue={formData.especialidade}
              onValueChange={(itemValue) => handleChange('especialidade', itemValue)}
              style={formStyles.picker}
            >
              {especialidades.map(esp => (
                <Picker.Item key={esp} label={esp} value={esp} />
              ))}
            </Picker>
          </View>
          {errors.especialidade && <Text style={formStyles.errorText}>{errors.especialidade}</Text>}
        </View>

        <ValidatedInput 
          label="CRM" 
          name="crm" 
          placeholder="Ex: 12345/MG" 
        />

        {/* 2. CONTATOS */}
        <Text style={styles.sectionHeader}>2. Contatos</Text>
        <ValidatedInput 
          label="Email" 
          name="email" 
          placeholder="email@exemplo.com" 
          keyboardType="email-address"
        />
        <ValidatedInput 
          label="Telefone Celular" 
          name="telefone" 
          placeholder="(XX) XXXXX-XXXX" 
          keyboardType="phone-pad"
        />

        {/* 3. ENDEREÇO PROFISSIONAL */}
        <Text style={styles.sectionHeader}>3. Endereço Profissional</Text>
        <ValidatedInput 
          label="Logradouro" 
          name="logradouro" 
          placeholder="Ex: Rua das Flores" 
        />
        <View style={formStyles.row}>
          <ValidatedInput 
            label="Número" 
            name="numero" 
            placeholder="Nº" 
            keyboardType="numeric"
            style={formStyles.inputHalf}
          />
          <ValidatedInput 
            label="Complemento" 
            name="complemento" 
            placeholder="Apto/Sala (Opcional)"
            style={formStyles.inputHalf}
          />
        </View>
        <ValidatedInput 
          label="Cidade" 
          name="cidade" 
          placeholder="Ex: Belo Horizonte" 
        />
        <View style={formStyles.row}>
          <ValidatedInput 
            label="UF" 
            name="uf" 
            placeholder="Ex: MG" 
            maxLength={2}
            style={formStyles.inputQuarter}
          />
          <ValidatedInput 
            label="CEP" 
            name="cep" 
            placeholder="XXXXX-XXX" 
            keyboardType="numeric"
            maxLength={9}
            style={formStyles.inputThreeQuarter}
          />
        </View>
      </ScrollView>

      {/* BOTÕES FIXOS NA PARTE INFERIOR */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[formStyles.button, formStyles.saveButton]}
          onPress={handleSubmit}
        >
          <Text style={formStyles.buttonText}>{buttonTitle}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[formStyles.button, formStyles.cancelButton]}
          onPress={onCancel || (() => navigation && navigation.goBack())}
        >
          <Text style={formStyles.buttonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  
  // Estilos da Foto de Perfil / Avatar
  avatarContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
  },
  avatarPlaceholder: {
    backgroundColor: '#e1e8ee',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  avatarText: {
    color: '#777',
    fontSize: 13,
    fontWeight: '500',
  },
  botaoFoto: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  botaoFotoTexto: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },

  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#007AFF',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

const formStyles = StyleSheet.create({
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
    fontWeight: '500',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    height: 45,
  },
  inputError: {
    borderColor: 'red',
    borderWidth: 2,
    backgroundColor: '#ffe8e8',
  },
  errorText: {
    fontSize: 12,
    color: 'red',
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  inputHalf: {
    flex: 1,
  },
  inputQuarter: {
    flex: 0.3,
  },
  inputThreeQuarter: {
    flex: 0.7,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    height: 45,
    overflow: 'hidden',
  },
  picker: {
    height: Platform.OS === 'ios' ? undefined : 45,
    width: '100%',
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MedicoForm;