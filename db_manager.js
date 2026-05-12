import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

var url = "https://hhxuvjiksyooedjzaabd.supabase.co"

const supabase = createClient(url)

const getID = () => localStorage.getItem("id");

export async function generateProfile(email, password) {
    //If a profile was already created
    if (getID()) {
        const { data, error } = await supabase
            .from('SafeSend_Users')
            .select('id')
            .eq('id', getID())
            .maybeSingle();

        if (error) {
            console.error(error);
            return;
        }
        if (data)//If the row already exists
            return;
    }

    const { data, error } = await supabase.from('SafeSend_Users').insert([{ email: email, password: password }]).select()

    localStorage.setItem("id", data[0].id);

    if (error)
        console.error(error)
}

export async function logById(id) {
    const { data, error } = await supabase
        .from('SafeSend_Users')
        .select('*')
        .eq('id', id)
        .select('*')
        .single();

    if (error)
        console.error(error)

    console.log(data)
}

export async function logAll() {
    const { data, error } = await supabase.from('SafeSend_Users').select('*');

    console.log(data)
}

export async function logStuff() {
    showStatistics(1, true) 
}

//DATA ANALYSIS FUNCTIONS
export async function getTotalUsers() {
    const { count, error } = await supabase
        .from('SafeSend_Users')
        .select('*', { count: 'exact', head: true }); // head=true avoids fetching all rows

    if (error) {
        console.error(error);
        return 0;
    }

    return count ?? 0;
}

export async function getData() {
    const { data, error } = await supabase
        .from('SafeSend_Users')
        .select('*');

    if (error) {
        console.error(error)
        return "";
    }
    
    return data
}

export async function getDataById(id) {
    const { data, error } = await supabase
        .from('SafeSend_Users')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error(error)
        return "";
    }
    
    return data
}
