import { useUser } from '@/contexts/UserContext';
import { toast } from '@/utils/toast';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function LoginScreen() {
    const router = useRouter();
    const { login } = useUser();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [agreed, setAgreed] = useState(true);

    const handleLogin = async () => {
        if (!agreed) {
            toast.warning('提示', '请同意用户协议和隐私政策');
            return;
        }

        if (!username || !password) {
            toast.warning('提示', '请输入账号和密码');
            return;
        }

        try {
            setLoading(true);
            const result = await login(username, password);

            if (result.success) {
                toast.success('登录成功');
                router.replace('/');
            } else {
                toast.error('登录失败', result.message);
            }
        } catch (error: any) {
            toast.error('登录失败', error.message || '网络错误');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* App Icon */}
                <View style={styles.iconContainer}>
                    <Image
                        source={require('@/img/fish.png')}
                        style={styles.icon}
                        contentFit="contain"
                    />
                </View>

                {/* Login Card */}
                <View style={styles.card}>
                    {/* Username Input */}
                    <TextInput
                        style={styles.input}
                        placeholder="请输入账号/邮箱"
                        placeholderTextColor="#999"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    {/* Password Input */}
                    <TextInput
                        style={styles.input}
                        placeholder="请输入密码"
                        placeholderTextColor="#999"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoCapitalize="none"
                    />

                    {/* Login Button */}
                    <TouchableOpacity
                        style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        <Text style={styles.loginButtonText}>›</Text>
                    </TouchableOpacity>

                    {/* Register Link */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>还没有账号？</Text>
                        <TouchableOpacity onPress={() => toast.info('提示', '请前往官网注册')}>
                            <Text style={styles.registerLink}>立即注册</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Agreement */}
                    <TouchableOpacity
                        style={styles.agreementContainer}
                        onPress={() => setAgreed(!agreed)}
                    >
                        <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                            {agreed && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.agreementText}>
                            登录即同意
                            <Text style={styles.link}>《用户协议》</Text>
                            和
                            <Text style={styles.link}>《隐私政策》</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    iconContainer: {
        marginBottom: 30,
    },
    icon: {
        width: 80,
        height: 80,
        borderRadius: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 32,
        width: '100%',
        maxWidth: 360,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    input: {
        width: '100%',
        height: 48,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 24,
        paddingHorizontal: 20,
        fontSize: 16,
        color: '#333',
        backgroundColor: '#fff',
        marginBottom: 16,
    },
    loginButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#555',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    loginButtonDisabled: {
        backgroundColor: '#999',
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '300',
        marginTop: -4,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    footerText: {
        color: '#666',
        fontSize: 14,
    },
    registerLink: {
        color: '#333',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 8,
        textDecorationLine: 'underline',
    },
    agreementContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#4CAF50',
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#4CAF50',
    },
    checkmark: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    agreementText: {
        fontSize: 13,
        color: '#666',
    },
    link: {
        color: '#333',
        textDecorationLine: 'underline',
    },
});
