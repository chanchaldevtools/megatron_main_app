import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

const CardView = () => {
  return (
        <View style={{ backgroundColor:"#fff",elevation:3,width: "100%",padding: 10,}}>
           <Text style={{ color:"black", fontSize: 16, fontWeight: "bold"}}>Bakura to sonitpur assam</Text>
            <View style={{ height: 1, width: "70%",backgroundColor:"#d1d1d1" ,marginTop:5,marginBottom:5, }}  />
            <Text style={{ color:"#6d063f",fontWeight:"bold",fontSize:16,}}>ClientName : m/s joshi hardware</Text>
            <View style={{ flexDirection:"row",gap:20,marginTop: 5,}}>
              <Text style={{ color:"black",fontWeight:"500"}}>Vehicle No: BR06GG6748</Text>
              <Text>Trip Id: B-s1563</Text>
            </View>
            <Text style={{ marginTop: 2,fontSize:15,}}>Added By : Shiv Lakhan</Text>
            <View style={{ flexDirection:"row",gap:20,marginTop: 2}}>
               <Text style={{ fontWeight:"bold",fontSize: 17,color:"green"}}>Total:Rs.132264.00,</Text>
               <Text style={{ fontWeight: "bold",fontSize: 17,color:"red",}}>Due:Rs 82264.00</Text>
            </View>
            <View style={{ width: "100%",flexDirection:"row",
              justifyContent:"space-evenly"}}>
                <View style={{ backgroundColor:"green",alignItems:"center",
                  padding: 10,

                  paddingHorizontal: 20,
                  borderRadius: 10,
                  marginVertical: 10,
                  justifyContent:"center"}}>
                      <Text style={{ color:"white"}}>Payment Request</Text>
                </View>
   <View style={{ backgroundColor:"blue",alignItems:"center",
                  padding: 10,
                  paddingHorizontal: 20,
                  borderRadius: 10,
                  marginVertical: 10,
                  justifyContent:"center"}}>
                      <Text style={{ color:"white"}}>Transactions</Text>
                </View>
   <View style={{ backgroundColor:"yellow",alignItems:"center",
                  padding: 10,
                  paddingHorizontal: 30,
                  borderRadius: 10,
                  marginVertical: 10,
                  justifyContent:"center"}}>
                      <Text style={{ color:"white"}}>Doc +</Text>
                </View>
               
            </View>

            <View style={{
  position: "absolute",
  top: 28,
  right: 17,
  backgroundColor: "blue",
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 5,
  transform: [{ rotate: "50deg" }]
}}>
              <Text style={{ color:"white"}}>Payment</Text>
            </View>
      </View>  
  )
}

export default CardView

const styles = StyleSheet.create({})