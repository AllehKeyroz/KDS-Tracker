
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type UserCredential,
  type AuthError
} from "firebase/auth";
import { app } from "./firebase";

export const auth = getAuth(app);

export const signUpWithEmail = (email, password): Promise<UserCredential> => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const signInWithEmail = (email, password): Promise<UserCredential> => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signInWithGoogle = (): Promise<UserCredential> => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const logOut = (): Promise<void> => {
  return signOut(auth);
};

export const getFirebaseErrorMessage = (error: AuthError): string => {
    switch (error.code) {
        case 'auth/invalid-email':
            return 'O formato do email é inválido.';
        case 'auth/user-disabled':
            return 'Este usuário foi desabilitado.';
        case 'auth/user-not-found':
            return 'Usuário não encontrado.';
        case 'auth/wrong-password':
            return 'Senha incorreta.';
        case 'auth/email-already-in-use':
            return 'Este email já está em uso.';
        case 'auth/weak-password':
            return 'A senha é muito fraca.';
        case 'auth/operation-not-allowed':
             return 'Operação não permitida.';
        case 'auth/account-exists-with-different-credential':
            return 'Já existe uma conta com este email.';
        default:
            return 'Ocorreu um erro inesperado. Tente novamente.';
    }
}
