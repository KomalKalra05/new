'use server';
import {db,auth} from '@/firebase/admin';
import { cookies } from 'next/headers';

const ONE_WEEK_IN_MS = 60 * 60 * 24 * 7 * 1000;

export async function signUp(params:SignUpParams){
    const {uid,name,email} = params;
    try{
        const userRecord=await db.collection('users').doc(uid).get();
        if(userRecord.exists){
            return {
                success: false,
                message: 'User already exists'
            };
        }
        await db.collection('users').doc(uid).set({
            name,
            email
        });
        return{
            success: true,
            message: 'User created successfully'
        }
    }catch(e:any){
        console.error('Error during sign up:', e);
        if(e.code ==='auth/email-already-in-use'){
            return{
                success:false,
                message:'Email already in use'
            }
        }
        return {
            success: false,
            message: 'An error occurred during sign up'
        };
    }
}

export async function setSessionCookie(idToken:string){
    const cookieStore= await cookies();
    const sessionCookie=await auth.createSessionCookie(idToken, {
        expiresIn: ONE_WEEK_IN_MS,
    });

    cookieStore.set('session', sessionCookie, {
        maxAge: ONE_WEEK_IN_MS / 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax',
    })
}

export async function signIn(params:SignInParams){
    const {email,idToken}=params;
    try{
        const userRecord=await auth.getUserByEmail(email);
        if(!userRecord){
            return {
                success: false,
                message: 'User not found'
            };
        }
        await setSessionCookie(idToken);
        return {
            success: true,
            message: 'Sign in successful'
        };
    }catch(e:any){
        console.error(e);
        return{
            success: false,
            message: 'Failed to sign in'
        }
    }
}

export async function signOut() {
    const cookieStore = await cookies();
    cookieStore.set('session', '', {
        maxAge: 0,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax',
    });
    return {
        success: true,
        message: 'Signed out successfully'
    };
}

export async function getCurrentUser():Promise<User|null>{
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) {
        return null;
    }
    try{
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        const userRecord =await db.collection('users').doc(decodedClaims.uid).get();
        if (!userRecord.exists) {
            return null;
        }
        const userData = userRecord.data();
        return {
            ...userRecord.data(),
            id: userRecord.id
        } as User;
    }catch(e:any){
        console.error('Error getting current user:', e);
        return null;
    }
}

export async function isAuthenticated(){
    const user = await getCurrentUser();
    return !!user;
}