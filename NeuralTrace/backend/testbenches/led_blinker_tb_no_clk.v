`timescale 1ns / 1ps
module led_blinker_tb_no_clk;
    reg clk;
    reg reset;
    wire led;

    led_blinker uut ( .clk(clk), .reset(reset), .led(led) );

    initial begin
        clk = 0;
        reset = 1;
        #100 reset = 0;
        #200 $finish;
    end
endmodule
