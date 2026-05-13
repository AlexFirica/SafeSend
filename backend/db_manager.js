import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Supabase connection
const url = "https://hhxuvjiksyooedjzaabd.supabase.co"

const anon =
'sb_publishable_ukmy9hfPGZHjHcfhfFG7jw_zJznT2Ji'

const supabase = createClient(url, anon)

// LocalStorage helper
const getID = () => localStorage.getItem("id")

// CREATE USER
export async function generateProfile(email, password) {
    // ... (Keep existing check for existingUser) ...

    // Insert new user
    const { data, error } = await supabase
        .from('SafeSend_User')
        .insert([{ email, password }])
        .select();

    if (error) {
        console.error(error);
        // MODIFY: Return false or the error so the UI can react
        return { success: false, error: error.message };
    }

    localStorage.setItem("id", data[0].id);
    console.log("User created:", data);
    
    // MODIFY: Return success
    return { success: true };
}

// LOGIN USER
export async function login(email, password) {

    const { data, error } = await supabase
        .from('SafeSend_User')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .maybeSingle()

    if (error) {
        console.error(error)
        return false
    }

    if (!data) {
        console.log("Wrong email or password")
        return false
    }

    localStorage.setItem("id", data.id)

    console.log("Login successful")

    return true
}

// GET USER BY ID
export async function logById(id) {

    const { data, error } = await supabase
        .from('SafeSend_User')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        console.error(error)
        return
    }

    console.log(data)
}

// GET ALL USERS
export async function logAll() {

    const { data, error } = await supabase
        .from('SafeSend_User')
        .select('*')

    if (error) {
        console.error(error)
        return
    }

    console.log(data)
}

// TOTAL USERS
export async function getTotalUsers() {

    const { count, error } = await supabase
        .from('SafeSend_User')
        .select('*', {
            count: 'exact',
            head: true
        })

    if (error) {
        console.error(error)
        return 0
    }

    return count ?? 0
}

// GET ALL DATA
export async function getData() {

    const { data, error } = await supabase
        .from('SafeSend_User')
        .select('*')

    if (error) {
        console.error(error)
        return []
    }

    return data
}

// GET DATA BY ID
export async function getDataById(id) {

    const { data, error } = await supabase
        .from('SafeSend_User')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        console.error(error)
        return null
    }

    return data
}