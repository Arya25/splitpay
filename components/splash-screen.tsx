import LottieView from 'lottie-react-native';
import React, { useEffect } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../src/contexts/AuthContext';

interface SplashScreenProps {
  onFinish: () => void;
  showLoginButton?: boolean;
}

export function SplashScreen({ onFinish, showLoginButton = false }: SplashScreenProps) {
  const { signInWithGoogle, loading: authLoading } = useAuth();
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 10,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide after 3 seconds only if not showing login button
    if (!showLoginButton) {
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => onFinish());
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [fadeAnim, onFinish, scaleAnim, showLoginButton]);

  return (
    <View style={styles.container}>
      <LottieView
        source={require('../assets/animations/splash-helper.json')}
        autoPlay
        loop={true}
        style={styles.backgroundLottie}
      />
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <LottieView
            source={require('../assets/animations/splash.json')}
            autoPlay
            loop={false}
            style={styles.lottie}
          />
        </View>
        <Text style={styles.appName}>
          Split money the right way
        </Text>

        {showLoginButton && (
          <TouchableOpacity
            style={[styles.loginButton, authLoading && styles.loginButtonDisabled]}
            onPress={signInWithGoogle}
            disabled={authLoading}
          >
            <Text style={styles.loginButtonText}>
              {authLoading ? 'Signing in...' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>
        )}

          {showLoginButton && (
          <TouchableOpacity
            style={[styles.phoneButton, authLoading && styles.phoneButtonDisabled]}
            onPress={signInWithGoogle}
            disabled={authLoading}
          >
            <Text style={styles.phoneButtonText}>
              {authLoading ? 'Signing in...' : 'Continue with Phone'}
            </Text>
          </TouchableOpacity>
        )}

        {/* <ThemedText style={styles.tagline}>
          Split bills, settle easy
        </ThemedText> */}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  backgroundLottie: {
    position: 'absolute',
    top: -300,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32, // Add horizontal padding to prevent text from touching edges
  },
  logoContainer: {
    marginBottom: 32,
  },
  lottie: {
    width: 250,
    height: 250,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 34,
  },
  loginButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 40,
    minWidth: 200,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    width: 165
  },
  phoneButton: {
    backgroundColor: '#60b1f5',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 40,
    minWidth: 200,
    alignItems: 'center',
  },
  phoneButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  phoneButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    width: 165
  },
  tagline: {
    fontSize: 16,
    opacity: 0.7,
  },
});